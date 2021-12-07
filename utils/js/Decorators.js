/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {debounce, isFunction} from 'lodash';
import {throwIf, getOrCreate} from './LangUtils';
import {withDebug} from './LogUtils';

/**
 * Decorates a class method so that it is debounced by the specified duration.
 * Based on https://github.com/bvaughn/debounce-decorator.
 *
 * @param {number} duration - milliseconds to debounce.
 */
export function debounced(duration) {
    return function(target, key, descriptor) {
        const baseFn = descriptor.value;
        throwIf(!isFunction(baseFn), '@debounced must be applied to a class method.');
        return {
            ...descriptor,
            value: function() {
                // synthesize an inner debounced function to the instance (not the class)
                const fn = getOrCreate(this, '_xh_' + key, () => debounce(baseFn, duration));
                fn.apply(this, arguments);
            }
        };
    };
}

/**
 * Modify a method or getter so that it will compute once lazily and then cache the results.
 * Not appropriate for methods that take arguments. Typically useful on immutable objects.
 */
export function computeOnce(target, key, descriptor) {
    const {value, get} = descriptor;
    throwIf(!isFunction(value) && !isFunction(get),
        '@computeOnce must be applied to a zero-argument class method or getter.'
    );

    const isMethod = isFunction(value),
        baseFnName = isMethod ? 'value' : 'get',
        baseFn = isMethod ? value : get;
    return {
        ...descriptor,
        [baseFnName]: function() {
            return getOrCreate(this, '_xh_' + key, () => baseFn.call(this));
        }
    };
}

/**
 * Modify a method so that its execution is tracked and timed with a debug message.
 * @see withDebug
 */
export function logWithDebug(target, key, descriptor) {
    const {value} = descriptor;
    throwIf(!isFunction(value), '@logWithDebug must be applied to a class method.');
    return {
        ...descriptor,
        value: function(...args) {
            return withDebug(key, () => value.apply(this, args), this);
        }
    };
}
