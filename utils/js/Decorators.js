/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {debounce, isUndefined, isFunction} from 'lodash';
import {throwIf} from './LangUtils';


/**
 * Decorates a class method so that it is debounced by the specified duration.
 * Based on https://github.com/bvaughn/debounce-decorator.
 *
 * @param {number} duration - milliseconds to debounce.
 */
export function debounced(duration) {
    return function(target, key, descriptor) {
        return {
            configurable: true,
            enumerable: descriptor.enumerable,
            get: function() {
                // Attach this function to the instance (not the class)
                Object.defineProperty(this, key, {
                    configurable: true,
                    enumerable: descriptor.enumerable,
                    value: debounce(descriptor.value, duration)
                });

                return this[key];
            }
        };
    };
}

/**
 * Modify a method or getter so that it will compute once lazily, and then cache the results.
 *
 * Not appropriate for methods that take arguments.  Typically useful on immutable objects.
 */
export function computeOnce(target, key, descriptor) {
    const {value, get} = descriptor;
    throwIf(!isFunction(value) && !isFunction(get),
        'computeOnce should be applied to a zero-argument method or a getter.'
    );

    const isMethod = isFunction(value),
        baseFnName = isMethod ? 'value' : 'get',
        baseFn = isMethod ? value : get,
        cacheKey = '_xh_' + key;
    return {
        ...descriptor,
        [baseFnName]: function() {
            let val = this[cacheKey];
            if (isUndefined(val)) {
                val = this[cacheKey] = baseFn.call(this);
            }
            return val;
        }
    };
}
