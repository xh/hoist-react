/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {defaults} from 'lodash';

/**
 * Generate a renderer.
 * Renderers return a given formatter function.
 *
 * Renderers take a config for its formatter method
 * If this config is an object it will be cloned before being passed to its formatter.
 * Cloning ensures that the formatter gets a clean config object each time it is called.
 *
 * @param formatter - an existing method
 */
export function createRenderer(formatter) {
    return function(config) {
        const isObj = (typeof config === 'object');
        return (v) => {
            const formatterConfig = isObj ? defaults({}, config) : config,
                val = (typeof v === 'object') ? v.value : v;
            return formatter(val, formatterConfig);
        };
    };
}


export function saveOriginal(v, opts) {
    if (opts.originalValue === undefined) {
        opts.originalValue = v;
    }
}