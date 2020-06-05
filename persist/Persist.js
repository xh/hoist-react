/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {cloneDeep, isUndefined} from 'lodash';
import {PersistenceProvider} from './provider/PersistenceProvider';

/**
 * Decorator to make a class property persistent, syncing its value via a configured
 * `PersistenceProvider` to maintain and restore mutable values across browser sessions.
 *
 * This decorator may be used on any @observable or @bindable class property which is a primitive.
 * It will initialize the observable's value from the class's default `PersistenceProvider` and will
 * subsequently write back any changes to the property to that Provider. If the Provider has not
 * yet been populated with a value, or an error occurs, it will use the value set in-code instead.
 *
 * This decorator should always be applied "before" the mobx decorators, i.e. closest to definition,
 * second in file line order: `@bindable @persist fooBarFlag = true`
 *
 * This decorator depends upon setting a 'persistWith' property on the target object with
 * default PersistOptions.  See also @persistWith, a higher-order version of this decorator that
 * allows for setting property-specific options.
 */
export function persist(target, property, descriptor) {
    const initializer = createInitializer(target, property, descriptor, null);
    return {...descriptor, initializer};
}

/**
 * Decorator to make a class property persistent.
 *
 * This is a higher-order version of `@persist`.
 * Call this variant as a function to provide custom PersistOptions.
 *
 * @param {PersistOptions} options
 */
export function persistWith(options) {
    return function(target, property, descriptor) {
        const initializer = createInitializer(target, property, descriptor, options);
        return {...descriptor, initializer};
    };
}


//--------------------
// Implementation
//--------------------
function createInitializer(target, property, descriptor, options) {
    const codeValue = descriptor.initializer;
    return function() {
        let providerState;

        // Read from and attach to Provider.
        // Fail gently -- initialization exceptions causes stack overflows for MobX.
        try {
            const persistWith = {path: property, ...options, ...this.persistWith},
                provider = this.markManaged(PersistenceProvider.create(persistWith));
            providerState = cloneDeep(provider.read());
            this.addReaction({
                track: () => this[property],
                run: (data) => provider.write(data)
            });
        } catch (e) {
            console.error(
                `Failed to configure Persistence for '${property}'.  Be sure to fully specify 'persistWith' on this object or annotation.`
            );
        }

        // 2) Return data from provider data *or* code, if provider not yet set or failed
        return !isUndefined(providerState) ? providerState : codeValue?.call(this);
    };
}


/**
 * @typedef {Object} PersistOptions
 *
 * This object contains options for configuring Persistence for objects.  It is designed to
 * include some standard properties, as well as accommodate a flexible set of properties for both
 * the particular target object being persisted and the PersistenceProvider.
 *
 * @property {string} [type] - Type of PersistenceProvider to be used.  May be one of
 *      'pref'|'localStorage'|'dashView'.  If not provided, Hoist will auto-detect the type based
 *      on other keys provided.  For example a 'prefKey' argument will indicate a type of 'pref',
 *      while a 'localStorageKey' will indicate a type of 'localStorage'.
 * @property {string} [path] - path or key in provider data where state should be stored.  Optional
 *      value. If not provided, the property name or a name appropriate for the target will
 *      be used (e.g. 'gridModel')
 * @property {(object|number)} [debounce] - specification appropriate for lodash debounce. Governs
 *      the frequency at which the state is written back to the provider.  If not provided, a
 *      provider-appropriate default will be used (typically 250ms).
 * @property {*} spec.rest - Additional arguments. See PersistenceProvider and specific target
 *      for more details.
 */