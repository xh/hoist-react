/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {wait} from '@xh/hoist/promise';
import {observable} from 'mobx';
import {PersistableState, PersistenceProvider, PersistOptions} from './';

type ClassMemberDecoratorContext =
    | ClassFieldDecoratorContext
    | ClassAccessorDecoratorContext
    | ClassMethodDecoratorContext
    | ClassGetterDecoratorContext
    | ClassSetterDecoratorContext;

/**
 * Decorator to make a property "managed". Managed properties are designed to hold objects that
 * are created by the referencing object and that implement a `destroy()` method. On `destroy()`
 * of the owner, each managed property is destroyed.
 *
 * Applies to plain class fields, `accessor` fields, methods, and getters.
 *
 * @see HoistBase.markManaged
 */
export function managed(value: any, context: ClassMemberDecoratorContext): any {
    const {kind, name} = context;
    const property = String(name);

    // Install the property name on the class prototype, idempotently.
    const register = function (this: any) {
        if (!this.isHoistBase) {
            throw new Error('@managed decorator should be applied to a subclass of HoistBase');
        }
        const proto = Object.getPrototypeOf(this),
            key = '_xhManagedProperties';
        if (!Object.prototype.hasOwnProperty.call(proto, key)) {
            Object.defineProperty(proto, key, {
                value: [...(proto[key] ?? [])],
                writable: true,
                configurable: true,
                enumerable: false
            });
        }
        const arr = proto[key];
        if (!arr.includes(property)) arr.push(property);
    };

    // Babel's 2023-05 decorator pass does not reliably invoke addInitializer for field decorators,
    // so use the kind-appropriate registration mechanism.
    if (kind === 'field') {
        return function (this: any, initialValue: any) {
            register.call(this);
            return initialValue;
        };
    }
    if (kind === 'accessor') {
        return {
            init(this: any, initialValue: any) {
                register.call(this);
                return initialValue;
            }
        };
    }
    if (kind === 'method' || kind === 'getter') {
        context.addInitializer(register);
        return value;
    }
    throw new Error(
        `@managed must be applied to a class field, accessor, method, or getter (got kind='${kind}').`
    );
}

/**
 * Decorator to make a class property persistent.
 *
 * Provides the same functionality as {@link HoistBase.markPersist}. Apply this decorator AFTER
 * the mobx decorator — i.e. second in source order: `@bindable @persist accessor fooBarFlag = true`.
 *
 * See also `@persist.with(options)`, a higher-order variant that accepts custom `PersistOptions`.
 */
export const persist: ClassAccessorDecorator & {
    with: (options: PersistOptions) => ClassAccessorDecorator;
} = Object.assign(
    (_value: any, context: ClassAccessorDecoratorContext) => createPersistDecorator(context, null),
    {
        with(options: PersistOptions) {
            return function (_value: any, context: ClassAccessorDecoratorContext) {
                return createPersistDecorator(context, options);
            };
        }
    }
) as any;

//---------------------
// Types / Implementation
//---------------------
type ClassAccessorDecorator = (
    value: ClassAccessorDecoratorTarget<any, any>,
    context: ClassAccessorDecoratorContext
) => ClassAccessorDecoratorResult<any, any>;

function createPersistDecorator(
    context: ClassAccessorDecoratorContext,
    options: PersistOptions | null
): ClassAccessorDecoratorResult<any, any> {
    if (context.kind !== 'accessor') {
        throw new Error(
            '@persist must be applied to an `accessor` class field — typically combined with ' +
                '`@bindable` or `@observable`, e.g. `@bindable @persist accessor foo = true`.'
        );
    }
    const property = String(context.name);

    return {
        // Runs during instance initialization — `this` is the instance, `initialValue` is the
        // value from the inner decorator's init chain (or the in-code initializer if no inner
        // decorator). Returns the initial value (potentially overridden from the persisted state).
        init(this: any, initialValue: any): any {
            let ret = initialValue;

            // The accessor's setter writes through the mobx observable, but only after the outer
            // decorator (typically @bindable) has installed the getter/setter pair at the end of
            // instance construction. We gate writes-back-to-instance on a `propertyAvailable`
            // flag that flips on the next tick.
            const propertyAvailable = observable.box(false),
                persistOptions = {
                    path: property,
                    ...PersistenceProvider.mergePersistOptions(this.persistWith, options)
                };

            PersistenceProvider.create({
                persistOptions,
                owner: this,
                target: {
                    getPersistableState: () =>
                        new PersistableState(propertyAvailable.get() ? this[property] : ret),
                    setPersistableState: state => {
                        if (!propertyAvailable.get()) {
                            ret = state.value;
                        } else {
                            this[property] = state.value;
                        }
                    }
                }
            });

            wait().thenAction(() => propertyAvailable.set(true));
            return ret;
        }
    };
}
