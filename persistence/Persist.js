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
 * Decorator to make a class property persistent.
 *
 * This decorator may be used on an @observable or @bindable class property which is a primitive.
 * It will cause the observable to initialize from the classes default PersistenceProvider and will
 * subsequently write back any changes to the property to that Provider.  If the Provider has not
 * yet been populated with a value, or an error occurs, the code provided value will be used instead.
 *
 * This decorator should always be applied "before" the mobx decorators, i.e. closest to definition,
 * second in file line order.
 *
 * See also @persistWith, a higher-order version of this decorator that allows for a
 * configurable provider.
 */
export function persist(target, property, descriptor) {
    const initializer = createInitializer(target, property, descriptor, null);
    return {...descriptor, initializer};
}

/**
 * Decorator to make a class property persistent.
 *
 * @param {PersistenceProvider} providerSpec
 *
 * Higher-order version of @persist, that is called as a function that accepts a specific
 * PersistenceProvider as an argument.
 *
 * See also @persist.
 */
export function persistWith(providerSpec) {
    return function(target, property, descriptor) {
        const initializer = createInitializer(target, property, descriptor, providerSpec);
        return {...descriptor, initializer};
    };
}


//---------------
// Implementation
//---------------
function createInitializer(target, property, descriptor, providerSpec) {
    const codeValue = descriptor.initializer;
    return function() {
        let provider, providerData;

        // Read from and attach to Provider.
        // Fail gently -- initialization exceptions causes stack overflows for MobX.
        try {
            provider = providerSpec ? getProvider(providerSpec) : getDefaultProvider(this);
            providerData = cloneDeep(provider.read(property));
            this.addReaction({
                track: () => this[property],
                run: (data) => provider.write(property, data)
            });
        } catch (e) {
            console.error(`Failed to read from PersistenceProvider for property ${property}`, e);
        }

        // 2) Return data from provider data *or* code, if provider not yet set or failed
        return !isUndefined(providerData) ? providerData : codeValue?.call(this);
    };
}

function getDefaultProvider(obj) {
    if (!obj._xhPersistWith) {
        let {persistWith} = obj;
        throwIf(!persistWith, "No Persistence Provider defined for object.  Set 'persistWith'.");
        obj._xhPersistWith = getProvider(persistWith);
    }
    return obj._xhPersistWith;
}


function getProvider(spec) {
    return spec.isPersistenceProvider ? spec : PersistenceProvider.create(spec);
}

