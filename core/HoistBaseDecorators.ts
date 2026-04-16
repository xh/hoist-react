/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';
import {PersistableState, PersistenceProvider, PersistOptions} from './';

type FieldOrAccessorOrGetterContext =
    | ClassFieldDecoratorContext
    | ClassAccessorDecoratorContext
    | ClassGetterDecoratorContext;

/**
 * Decorator to make a property "managed". Managed properties are designed to hold objects that
 * are created by the referencing object and that implement a `destroy()` method. On `destroy()`
 * of the owner, each managed property is destroyed.
 *
 * Applies to plain class fields, `accessor` fields, and getters.
 *
 * @see HoistBase.markManaged
 */
export function managed(_value: any, context: FieldOrAccessorOrGetterContext): any {
    const {name} = context,
        key = '_xhManagedProperties';

    context.addInitializer(function (this: any) {
        const target = Object.getPrototypeOf(this);

        // Early out on instances after 1st...
        if (target[key]?.includes(name)) return;

        // Install the property name on the class prototype
        // Be sure to create list for *this* particular class. Clone and include inherited values.
        throwIf(
            !this.isHoistBase,
            '@managed decorator should be applied to a subclass of HoistBase'
        );
        if (!target.hasOwnProperty(key)) {
            target[key] = [...(target[key] ?? [])];
        }
        target[key].push(name);
    });
}

/**
 * Decorator to make a class property persistent.
 *
 * This decorator provides the same functionality as {@link HoistBase.markPersist}. See that method
 * for more details.
 *
 * This decorator should always be applied "after" the mobx decorator, i.e. second in file line
 * order: `@bindable @persist accessor fooBarFlag = true`
 *
 * See also `@persist.with`, a higher-order version of this decorator that allows for setting
 * property-specific persistence options.
 */
export const persist: any = (_value: any, context: ClassAccessorDecoratorContext) => {
    return createPersistResult(context, null);
};

/**
 * Decorator to make a class property persistent. This is a higher-order version of `@persist`.
 * Use this variant as a function to provide custom PersistOptions.
 */
persist.with = function (options: PersistOptions): any {
    return function (_value: any, context: ClassAccessorDecoratorContext) {
        return createPersistResult(context, options);
    };
};

//---------------------
// Implementation
//---------------------
function createPersistResult(
    context: ClassAccessorDecoratorContext,
    options: PersistOptions
): ClassAccessorDecoratorResult<any, any> {
    const {name} = context;
    return {
        init(initialValue: any): any {
            throwIf(
                !this.isHoistBase,
                '@persist decorator should be applied to an instance of HoistBase'
            );

            const persistOptions = {
                path: name as string,
                ...PersistenceProvider.mergePersistOptions(this.persistWith, options)
            };

            PersistenceProvider.create({
                persistOptions,
                owner: this,
                target: {
                    getPersistableState: () => new PersistableState(this[name]),
                    setPersistableState: state => {
                        this[name] = state.value;
                    }
                }
            });

            return initialValue;
        }
    };
}
