/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {debounce} from 'lodash';


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