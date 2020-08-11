/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {PersistenceProvider} from '@xh/hoist/core';
import {applyMixin} from '@xh/hoist/utils/js';

import {cloneDeep, isUndefined} from 'lodash';
import {runInAction} from '@xh/hoist/mobx';
import {start} from '@xh/hoist/promise';
/**
 * Mixin to support Persistent properties on an object
 */
export function PersistSupport(C) {
    return applyMixin(C, {
        name: 'PersistSupport',

        defaults: {
            /**
             *  Method to make a class property persistent, syncing its value via a configured
             * `PersistenceProvider` to maintain and restore values across browser sessions.
             *
             * This may be used on any @observable or @bindable class property which is a primitive.
             * It will initialize the observable's value from the class's default
             * `PersistenceProvider` and will subsequently write back any changes to the property
             * to that Provider. If the Provider has not yet been populated with a value, or an
             * error occurs, it will use the value set in-code instead.
             *
             * @param {string} property - name of property on this object to bind to a
             *      persistence provider.
             * @param {PersistOptions} [options] - options governing the persistence of this
             *      object.  These will be applied on top of any default persistWith options defined
             *      on the instance itself.
             *
             * See also @persist and @persist.with for a convenient decorator that may be used
             * directly on the property declaration itself.  Use this method in the general case,
             * when you need to control the timing,
             */
            markPersist(property, options = {}) {
                // Read from and attach to Provider, failing gently
                try {
                    const persistWith = {path: property, ...this.persistWith, ...options},
                        provider = this.markManaged(PersistenceProvider.create(persistWith)),
                        providerState = provider.read();
                    if (!isUndefined(providerState)) {
                        runInAction(() => this[property] = cloneDeep(providerState));
                    }
                    this.addReaction({
                        track: () => this[property],
                        run: (data) => provider.write(data)
                    });
                } catch (e) {
                    console.error(
                        `Failed to configure Persistence for '${property}'.  Be sure to fully specify ` +
                        `'persistWith' on this object or in the method call.`
                    );
                }
            }
        }
    });
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
    return createDescriptor(target, property, descriptor, null);
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
        return createDescriptor(target, property, descriptor, options);
    };
};

//--------------------
// Implementation
//--------------------
function createDescriptor(target, property, descriptor, options) {
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
 *      'pref'|'localStorage'|'dashView'. If not provided (most common), Hoist will auto-detect
 *      the type based on other keys provided. For example a 'prefKey' argument implies a type of
 *      'pref', while a 'localStorageKey' implies a type of 'localStorage' - see below.
 * @property {string} [prefKey] - name of Hoist preference for pref-based storage. Supplying a
 *      value for this property will create a {@see PrefProvider}.
 * @property {string} [localStorageKey] - unique string key for LocalStorage based state storage.
 *      Supplying a value for this property will create a {@see LocalStorageProvider}.
 * @property {DashViewModel} [dashViewModel] - model instance for Dashboard-based state storage.
 *      Supplying a value for this property will create a {@see DashViewProvider}.
 * @property {string} [path] - path or key in provider data where state should be stored.
 *      If not provided, the provider will use the name of the class property being persisted or
 *      another auto-selected name suitable to the particular target (e.g. 'gridModel')
 * @property {(object|number)} [debounce] - specification appropriate for lodash debounce. Governs
 *      the frequency at which the state is written back to the provider. If not provided, a
 *      provider-appropriate default will be used (typically 250ms).
 * @property {*} spec.rest - Additional arguments. {@see PersistenceProvider} and specific target
 *      for more details.
 */