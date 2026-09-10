/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {wait} from '@xh/hoist/promise';
import {observable} from 'mobx';
import {logError, throwIf} from '../utils/js';
import {
    HoistBase,
    HoistBaseClass,
    PersistableState,
    PersistenceProvider,
    persistOptions,
    PersistOptions
} from './';

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
 * Works under both flavors of legacy-decorator emit: Babel's, where field decorators receive a
 * descriptor with an `initializer` this decorator can wrap, and TypeScript's (as produced by
 * `tsc` and SWC), where field decorators receive no descriptor at all. In the latter case the
 * property is recorded on the class and wired to its provider by Hoist's `makeObservable`, once
 * the instance's field initializers have run - so its persisted value is in place by the time
 * the declaring class's constructor body continues past `makeObservable(this)`.
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

    // TypeScript-style emit: no descriptor, so no initializer to wrap. Record on the class (per
    // class, including inherited entries) for installation from makeObservable.
    if (!descriptor) {
        const key = '_xhPersistProperties';
        if (!target.hasOwnProperty(key)) {
            target[key] = {...target[key]};
        }
        target[key][property] = {options, install: installPersist};
        return descriptor;
    }

    if (descriptor.get || descriptor.set) {
        logError(
            `Error defining ${property} : @persist or @persistWith should be defined closest ` +
                `to property, and after mobx annotation e.g. '@bindable @persist ${property}'`,
            target
        );
        return descriptor;
    }
    // Babel-style emit: wrap the field initializer, so the persisted value is the initial value.
    const codeValue = descriptor.initializer,
        initializer = function () {
            // codeValue undefined if no initial in-code value provided, otherwise call to get initial value.
            return installPersist(this, property, options, codeValue?.call(this));
        };
    return {...descriptor, initializer};
}

/**
 * Bind a property on a HoistBase instance to a PersistenceProvider, returning the value the
 * property should take initially - the persisted value if one exists, else the in-code default.
 * Called during construction, before the property has been made observable.
 */
function installPersist(
    instance: HoistBase,
    property: string,
    options: PersistOptions,
    codeValue: any
): any {
    let ret = codeValue;

    // Property is not available (and observable) on the instance until after the next tick.
    const propertyAvailable = observable.box(false);
    PersistenceProvider.create({
        persistOptions: persistOptions({path: property}, instance.persistWith, options),
        owner: instance,
        target: {
            getPersistableState: () =>
                new PersistableState(propertyAvailable.get() ? instance[property] : ret),
            setPersistableState: state => {
                if (!propertyAvailable.get()) {
                    ret = state.value;
                } else {
                    instance[property] = state.value;
                }
            }
        }
    });

    // Wait for next tick to ensure construction has completed and property has been made
    // observable via makeObservable.
    wait().thenAction(() => propertyAvailable.set(true));

    return ret;
}
