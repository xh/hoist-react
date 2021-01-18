/*
* This file belongs to Hoist, an application development toolkit
* developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
*
* Copyright © 2020 Extremely Heavy Industries Inc.
*/
import {PersistenceProvider} from '@xh/hoist/core';

import {cloneDeep, isUndefined} from 'lodash';
import {start} from '@xh/hoist/promise';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Decorator to make a property "managed". Managed properties are designed to hold objects that
 * are created by the referencing object and that implement a `destroy()` method.
 *
 * See also (@see HoistBase.markManaged}.
 */
export function managed(target, property, descriptor) {
    throwIf(!target.isHoistBase, '@managed decorator should be applied to an instance of HoistBase');
    // Be sure to create list for *this* particular class. Clone and included inherited values.
    if (!target.hasOwnProperty('xhManagedProperties')) {
        target._xhManagedProperties = [...(target._xhManagedProperties ?? [])];
    }
    target._xhManagedProperties.push(property);
    return descriptor;
}

/**
 * Decorator to make a class property persistent.
 *
 * This decorator provides the same functionality as HoistBase.markPersist().  See that method
 * for more details.
 *
 * This decorator should always be applied "before" the mobx decorator, i.e. second in file line
 * order: `@bindable @persist fooBarFlag = true`.
 *
 * See also @persist.with, a higher-order version of this decorator that allows for setting
 * property-specific persistence options.
 */
export function persist(target, property, descriptor) {
    return createPersistDescriptor(target, property, descriptor, null);
}

/**
 * Decorator to make a class property persistent.
 *
 * This is a higher-order version of `@persist`.  Use this variant as a function to
 * provide custom PersistOptions.
 *
 * @param {PersistOptions} options
 */
persist.with = function(options) {
    return function(target, property, descriptor) {
        return createPersistDescriptor(target, property, descriptor, options);
    };
};


//---------------------
// Implementation
//---------------------
function createPersistDescriptor(target, property, descriptor, options) {
    throwIf(!target.isHoistBase, '@persist decorator should be applied to an instance of HoistBase');
    if (descriptor.get || descriptor.set) {
        console.error(
            `Error defining ${property} : @persist or @persistWith should be defined closest ` +
            `to property, and after mobx annotation e.g. '@bindable @persist ${property}'`
        );
        return descriptor;
    }
    const codeValue = descriptor.initializer;
    const initializer = function() {
        let providerState;

        // Read from and attach to Provider.
        // Fail gently -- initialization exceptions causes stack overflows for MobX.
        try {
            const persistWith = {path: property, ...this.persistWith, ...options},
                provider = this.markManaged(PersistenceProvider.create(persistWith));
            providerState = cloneDeep(provider.read());
            start(() => {
                this.addReaction({
                    track: () => this[property],
                    run: (data) => provider.write(data)
                });
            });
        } catch (e) {
            console.error(
                `Failed to configure Persistence for '${property}'.  Be sure to fully specify ` +
                `'persistWith' on this object or annotation.`
            );
        }

        // 2) Return data from provider data *or* code, if provider not yet set or failed
        return !isUndefined(providerState) ? providerState : codeValue?.call(this);
    };
    return {...descriptor, initializer};
}