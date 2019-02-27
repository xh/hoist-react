/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {isObject, debounce} from 'lodash';

/**
 * Log an error if a parameterized decorator is applied without being called first.
 *
 * Call this when defining a 'parameterized' decorator that needs to be called as a function.
 * This will throw if the decorator is ever applied to a property without calling it first -
 * an easy-to-make mistake given that many core decorators are *not* parameterized. See the
 * implementation of `field` decorator for an example.
 *
 *  @param {string} decoratorName - the name of the decorator being defined.
 *  @param {...*} params - the arguments passed to the invocation of the parameterized decorator.
 */
export function ensureParameterizedDecoratorPreCalled(decoratorName, ...params) {

    if (params.length === 3 && isObject(params[2]) && ('configurable' in params[2] || 'enumerable' in params[2])) {
        throw new Error(
            `It looks like you are using the '${decoratorName}' decorator on ` +
            `${params[0].constructor.name}.${params[1]} without calling it as a function. ` +
            `Ensure it is called as @${decoratorName}(), even if you are not providing it with any arguments.`
        );
    }
}


/**
 * Decorates a class method so that it is debounced by the specified duration.
 * Based on https://github.com/bvaughn/debounce-decorator.
 *
 *  @param {name} duration - milliseconds to debounce.
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