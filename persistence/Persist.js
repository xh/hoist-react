/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {cloneDeep, isUndefined} from 'lodash';
import {PersistenceProvider} from './provider/PersistenceProvider';
import {throwIf} from '@xh/hoist/utils/js';


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
 * See also @persistWith, a higher-order version of this decorator that allows for a
 * configurable provider.
 */
export function persist(target, property, descriptor) {
    const initializer = createInitializer(target, property, descriptor, null);
    return {...descriptor, initializer};
}

/**
 * Decorator to make a class property persistent. This is a higher-order version of `@persist`.
 * Call this variant as a function to pass a specific PersistenceProvider as an argument.
 *
 * @param {PersistenceProvider} providerSpec
 */
export function persistWith(providerSpec) {
    return function(target, property, descriptor) {
        const initializer = createInitializer(target, property, descriptor, providerSpec);
        return {...descriptor, initializer};
    };
}


//------------------------
// Implementation
//------------------------
function createInitializer(target, property, descriptor, providerSpec) {
    const codeValue = descriptor.initializer;
    return function() {
        let providerState;

        // Read from and attach to Provider.
        // Fail gently -- initialization exceptions causes stack overflows for MobX.
        try {
            const provider = providerSpec ?
                PersistenceProvider.getOrCreate(providerSpec) :
                getDefaultProvider(this);
            providerState = cloneDeep(provider.read(property));
            this.addReaction({
                track: () => this[property],
                run: (data) => provider.write(property, data)
            });
        } catch (e) {
            console.error(`Failed to read from PersistenceProvider for property ${property}`, e);
        }

        // 2) Return data from provider data *or* code, if provider not yet set or failed
        return !isUndefined(providerState) ? providerState : codeValue?.call(this);
    };
}

function getDefaultProvider(obj) {
    if (!obj._xhPersistWith) {
        let {persistWith} = obj;
        throwIf(!persistWith, "No Persistence Provider defined for object - declare via a 'persistWith' field on this class.");
        obj._xhPersistWith = PersistenceProvider.getOrCreate(persistWith);
    }
    return obj._xhPersistWith;
}


