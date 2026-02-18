/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Exception} from '@xh/hoist/exception';
import {debounce, isFunction} from 'lodash';
import {getOrCreate, throwIf} from './LangUtils';
import {withDebug, warnIf, withInfo, logWarn} from './LogUtils';

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
            throw Exception.create(`${key} must be implemented by ${this.constructor.name}`);
        }
    };
}

/**
 * Decorates a class method that returns a Promise so that concurrent calls with the same arguments
 * will share a single pending Promise. Arguments must be serializable via JSON.stringify.
 */
export function sharePendingPromise<T>(target: T, key: string, descriptor: PropertyDescriptor) {
    const fn = descriptor.value;
    return {
        ...descriptor,
        value: function () {
            try {
                const cacheKey = '_xh_' + key + JSON.stringify(arguments);
                return getOrCreate(this, cacheKey, () => {
                    const ret = fn.apply(this, arguments);
                    if (!(ret instanceof Promise)) {
                        logWarn(
                            `@sharePendingPromise applied to non-Promise-returning method: ${key}`,
                            this.constructor.name
                        );
                        return ret;
                    }
                    return ret.finally(() => delete this[cacheKey]);
                });
            } catch (e) {
                logWarn(
                    [
                        `@sharePendingPromise unable to serialize arguments for method: ${key}.`,
                        e.message
                    ],
                    this.constructor.name
                );
                return fn.apply(this, arguments);
            }
        }
    };
}
