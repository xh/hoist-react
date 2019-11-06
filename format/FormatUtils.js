/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {defaults, isPlainObject} from 'lodash';

/**
 * Generate a renderer for a given formatter function.
 *
 * The returned renderer takes an optional config for its assigned formatter and itself returns
 * a function that takes only a value, for convenient use with e.g. grid cell rendering.
 *
 * If the formatter config is an object it will be cloned before being passed to its formatter
 * to ensure that the formatter gets its own clean copy each time it is called.
 *
 * @param {function} formatter - an existing formatter method.
 * @return {function(v: Object):function} - a configurable renderer.
 */
export function createRenderer(formatter) {
    return function(config) {
        const isObj = isPlainObject(config);
        return v => {
            const formatterConfig = isObj ? defaults({}, config) : config;
            return formatter(v, formatterConfig);
        };
    };
}

/**
 * Install a value on an options object as `originalValue` for later reference, if an
 * originalValue key has not already been set.
 *
 * @param v - value to store.
 * @param {Object} opts - object on which the value can be stored.
 */
export function saveOriginal(v, opts) {
    if (opts.originalValue === undefined) {
        opts.originalValue = v;
    }
}
