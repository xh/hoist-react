/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH, PersistenceProvider} from '@xh/hoist/core';
import {applyMixin} from '@xh/hoist/utils/js';

import {cloneDeep, isUndefined, values} from 'lodash';
import {runInAction} from '@xh/hoist/mobx';

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
            markPersistent(property, options = {}) {
                const providers = this._xhPersistenceProviders = this._xhPersistenceProviders ?? {};

                // Read from and attach to Provider.
                // Fail gently -- initialization exceptions causes stack overflows for MobX.
                try {
                    const persistWith = {path: property, ...options, ...this.persistWith};
                    const provider = providers[property] = PersistenceProvider.create(persistWith);
                    const providerState = provider.read();
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
                        `'persistWith' on this object, method call, or annotation.`
                    );
                }
            }
        },

        chains: {
            destroy() {
                XH.safeDestroy(values(this._xhPersistenceProviders));
            }
        }
    });
}

/**
 * Decorator to make a class property persistent.
 *
 * This decorator is provided as a convenient way to invoke markPersistent().  See that
 * method for more details. See also @persist.with, a higher-order version of this decorator
 * that allows for setting property-specific options.
 *
 * This decorator should always be applied "after" the mobx decorator, i.e. first in file line
 * order: `@persist @bindable fooBarFlag = true`.
 */
export function persist(target, property, descriptor) {
    return createDescriptor(target, property, descriptor, null);
}

/**
 * Decorator to make a class property persistent.
 *
 * This is a higher-order version of `@persist`.  Call this variant as a function to
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
    const observableGet = descriptor.get;
    if (!observableGet) {
        console.error(
            `Error defining ${property} : @persist must be applied "after" the mobx decorator, ` +
             `i.e. first in file line order: '@persist @bindable ${property}'`
        );
        return descriptor;
    }

    const get = function() {
        const providers = this._xhPersistenceProviders;
        if (!providers || !providers[property]) this.markPersistent(property, options);
        return observableGet.call(this);
    };

    return {...descriptor, get};
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