/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {PersistenceProvider} from '@xh/hoist/core';

import {cloneDeep, isUndefined} from 'lodash';
import {start} from '@xh/hoist/promise';

/**
 * Decorator to make a property "managed". Managed properties are designed to hold objects that
 * are created by the referencing object and that implement a `destroy()` method.
 *
 * See also (@see HoistBase.markManaged}.
 */
export function managed(target, property, descriptor) {
    target._xhManagedProperties = target._xhManagedProperties ?? [];
    target._xhManagedProperties.push(property);
    return descriptor;
}

/**
 * Decorator to make a class property persistent.
 *
 * This decorator provides the same functionality as markPersist().  See that method
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


/**
 * @typedef {Object} PersistOptions - contains options for configuring Hoist's shared approach
 *      to state persistence. It is designed to include some standard properties as well as
 *      accommodate a flexible set of properties for both the particular target object being
 *      persisted and the concrete `PersistenceProvider` instance created to do so.
 *
 * @property {string} [type] - Type of PersistenceProvider to be used. May be one of
 *      'pref'|'localStorage'|'dashView'|'custom'. If not provided (most common), Hoist
 *      will auto-detect the type based on other keys provided. For example a 'prefKey'
 *      argument implies a type of 'pref', while a 'localStorageKey' implies a type
 *      of 'localStorage' - see below.
 * @property {string} [prefKey] - name of Hoist preference for pref-based storage. Supplying a
 *      value for this property will create a {@see PrefProvider}.
 * @property {string} [localStorageKey] - unique string key for LocalStorage based state storage.
 *      Supplying a value for this property will create a {@see LocalStorageProvider}.
 * @property {DashViewModel} [dashViewModel] - model instance for Dashboard-based state storage.
 *      Supplying a value for this property will create a {@see DashViewProvider}.
 * @property {function} [setData] - function for setting custom state storage.
 *      Supplying a value for this property will create a {@see CustomProvider}.
 * @property {function} [getData] - function for getting custom state storage.
 *      Supplying a value for this property will create a {@see CustomProvider}.
 * @property {string} [path] - path or key in provider data where state should be stored.
 *      If not provided, the provider will use the name of the class property being persisted or
 *      another auto-selected name suitable to the particular target (e.g. 'gridModel')
 * @property {(object|number)} [debounce] - specification appropriate for lodash debounce. Governs
 *      the frequency at which the state is written back to the provider. If not provided, a
 *      provider-appropriate default will be used (typically 250ms).
 * @property {*} spec.rest - Additional arguments. {@see PersistenceProvider} and specific target
 *      for more details.
 */