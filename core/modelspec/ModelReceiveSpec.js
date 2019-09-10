/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';

/**
 * Specification for model to be received by a HoistComponent via props or context.
 *
 *
 * @see hoistComponent()
 */
export class ModelReceiveSpec {

    isReceive = true;

    selector;

    provide;
    optional;
    fromContext;
    fromConfig;

    /**
     * @private Applications should call receive() instead.
     */
    constructor(selector, flags) {
        this.selector = selector;

        throwIf(!this.selector, 'Must specify spec for ReceiveSpec.');

        this.provide = flags.provide;
        this.optional = flags.optional;
        this.fromContext = flags.fromContext;
        this.fromConfig = flags.fromConfig;
    }
}

/**
 * Specification for model to be created internally by a HoistComponent for use by itself, and potentially
 * its sub-components.
 *
 * @param {(Class|string|function)} selector - Specification of HoistModel to receive.  Should be a HoistModel 'selector'
 *      (classname, string, or function). '*' indicates any, or the most closely
 *      inherited model in context. See HoistModel.matches() for more info.
 * @param {Object} [flags]
 * @param {boolean} [flags.provide] - also place model in context so that contained components may consume.
 *      Default true.
 * @param {boolean} [flags.optional] - True if model should be optional.  Default false.
 * @param {boolean} [flags.fromContext] - look for model in context.  Default true
 * @param {boolean} [flags.fromConfig] - true to accept model from config, and generate a model instance
 *      locally.  Note that any model created in this  way will be considered to be 'owned' by the receiving
 *      component, and will be loaded and destroyed as if it were local.  Selector must be a classname of a
 *      HoistModel. Default to true.
 */
export function receive(selector, {provide = true,  optional = false, fromContext = true, fromConfig = true} = {}) {
    return new ModelReceiveSpec(selector, {provide, optional, fromContext, fromConfig});
}
