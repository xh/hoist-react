/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {apiDeprecated} from '@xh/hoist/utils/js';

/**
 * Generate a renderer for a given formatter function.
 *
 * The returned renderer takes an optional config for its assigned formatter and itself returns
 * a function that takes only a value, for convenient use with e.g. grid cell rendering.
 *
 * @param {function} formatter - an existing formatter method.
 * @return {function(v: Object):function} - a configurable renderer.
 */
export function createRenderer(formatter) {
    return function(config) {
        return v => formatter(v, config);
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

/**
 * Test for and output a deprecation warning for `asElement`
 */
export function asElementDeprecationWarning(opts) {
    apiDeprecated('asElement', {
        test: opts?.asElement,
        msg: 'Formatters return elements by default. You can use `asHtml` to return a HTML string'
    });
}
