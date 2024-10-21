/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {logError, throwIf} from '../utils/js';
import {HoistBaseClass, PersistenceProvider, PersistOptions} from './';

/**
 * Decorator to make a property "managed". Managed properties are designed to hold objects that
 * are created by the referencing object and that implement a `destroy()` method.
 *
 * @see HoistBase.markManaged
 */
export const managed: any = (target: HoistBaseClass, property: string, descriptor: any) => {
    throwIf(!target.isHoistBase, '@managed decorator should be applied to a subclass of HoistBase');
    // Be sure to create list for *this* particular class. Clone and include inherited values.
    const key = '_xhManagedProperties';
    if (!target.hasOwnProperty(key)) {
        target[key] = [...(target[key] ?? [])];
    }
    target[key].push(property);
    return descriptor;
};

/**
 * Decorator to make a class property persistent.
 *
 * This decorator provides the same functionality as {@link HoistBase.markPersist}. See that method
 * for more details.
 *
 * This decorator should always be applied "before" the mobx decorator, i.e. second in file line
 * order: `@bindable @persist fooBarFlag = true`
 *
 * See also `@persist.with`, a higher-order version of this decorator that allows for setting
 * property-specific persistence options.
 */
export const persist: any = (target: HoistBaseClass, property: string, descriptor: any) => {
    return createPersistDescriptor(target, property, descriptor, null);
};

/**
 * Decorator to make a class property persistent. This is a higher-order version of `@persist`.
 * Use this variant as a function to provide custom PersistOptions.
 */
persist.with = function (options: PersistOptions): any {
    return function (target, property, descriptor) {
        return createPersistDescriptor(target, property, descriptor, options);
    };
};

//---------------------
// Implementation
//---------------------
function createPersistDescriptor(
    target: HoistBaseClass,
    property: string,
    descriptor: any,
    options: PersistOptions
) {
    throwIf(
        !target.isHoistBase,
        '@persist decorator should be applied to an instance of HoistBase'
    );
    if (descriptor.get || descriptor.set) {
        logError(
            `Error defining ${property} : @persist or @persistWith should be defined closest ` +
                `to property, and after mobx annotation e.g. '@bindable @persist ${property}'`,
            target
        );
        return descriptor;
    }
    const codeValue = descriptor.initializer;
    let hasInitialized = false,
        ret;
    const initializer = function () {
        // Initializer can be called multiple times when stacking decorators.
        if (hasInitialized) return ret;

        ret = codeValue.call(this);

        const persistWith = {path: property, ...this.persistWith, ...options},
            provider = PersistenceProvider.create({
                ...persistWith,
                target: {
                    getPersistableState: () => (hasInitialized ? this[property] : ret),
                    setPersistableState: state => {
                        if (!hasInitialized) {
                            ret = state;
                        } else {
                            this[property] = state;
                        }
                    }
                }
            });
        this.markManaged(provider);

        hasInitialized = true;
        return ret;
    };
    return {...descriptor, initializer};
}
