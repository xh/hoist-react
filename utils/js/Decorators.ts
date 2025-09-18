/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {debounce, isFunction} from 'lodash';
import {getOrCreate, throwIf, warnIf} from './LangUtils';
import {withDebug, withInfo} from '../log';

/**
 * Decorates a class method so that it is debounced by the specified duration.
 * Based on https://github.com/bvaughn/debounce-decorator.
 *
 * @param duration - milliseconds to debounce.
 */
export function debounced(duration: number) {
    return function (target, key, descriptor) {
        const baseFn = descriptor.value;
        throwIf(!isFunction(baseFn), '@debounced must be applied to a class method.');
        return {
            ...descriptor,
            value: function () {
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
    throwIf(
        !isFunction(value) && !isFunction(get),
        '@computeOnce must be applied to a zero-argument class method or getter.'
    );

    const isMethod = isFunction(value),
        baseFnName = isMethod ? 'value' : 'get',
        baseFn = isMethod ? value : get;
    return {
        ...descriptor,
        [baseFnName]: function () {
            return getOrCreate(this, '_xh_' + key, () => baseFn.call(this));
        }
    };
}

/**
 * Modify a method so that its execution is tracked and timed with a log message on the console.
 * @see withInfo
 */
export function logWithInfo(target, key, descriptor) {
    const {value} = descriptor;
    throwIf(!isFunction(value), '@logWithInfo must be applied to a class method.');
    return {
        ...descriptor,
        value: function (...args) {
            return withInfo(key, () => value.apply(this, args), this);
        }
    };
}

/**
 * Modify a method so that its execution is tracked and timed with a debug message on the console.
 * @see withDebug
 */
export function logWithDebug(target, key, descriptor) {
    const {value} = descriptor;
    throwIf(!isFunction(value), '@logWithDebug must be applied to a class method.');
    return {
        ...descriptor,
        value: function (...args) {
            return withDebug(key, () => value.apply(this, args), this);
        }
    };
}

/**
 * Modify a member so that it is enumerable. Useful for getters, which default to enumerable = false
 */
export function enumerable(target, key, descriptor) {
    warnIf(descriptor.enumerable, `Unnecessary use of @enumerable: ${key} is already enumerable.`);
    return {...descriptor, enumerable: true};
}

/**
 * Designate a method or getter as abstract so that it throws if it is called directly
 */
export function abstract(target, key, descriptor) {
    const {value, get} = descriptor;
    throwIf(
        !isFunction(value) && !isFunction(get),
        '@abstract must be applied to a class method or getter.'
    );

    const isMethod = isFunction(value),
        baseFnName = isMethod ? 'value' : 'get';

    return {
        ...descriptor,
        [baseFnName]: function () {
            throw XH.exception(`${key} must be implemented by ${this.constructor.name}`);
        }
    };
}
