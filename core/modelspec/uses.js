/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';

import {ModelSpec} from './ModelSpec';


/**
 * Specification for primary model to be used by a HoistComponent and its sub-components.  Hoist will seek an existing
 * model from props, or context or use a creation function if neccessary.  The resolved model will be provided to the
 * actual component in props and placed in context for access by all sub-components.
 *
 * @param {(Class|string|function)} selector - Specification of HoistModel to use.  Should be a HoistModel
 *      'selector' (classname, string, or function). '*' indicates that any model in props, or the context model
 *      itself is acceptable.  See HoistModel.matches() for more info.
 * @param {Object} [flags]
 * @param {boolean} [flags.optional] - True if model should be optional.  Default false.
 * @param {boolean} [flags.fromContext] - look for model in context.  Default true.
 * @param {boolean} [flags.createFromConfig] - true to accept model config object from props and generate a model
 *      instance on-the-fly. Selector must be a classname of a HoistModel. Default true.
 * @params {(boolean|function)} [flags.createDefault] - create a model if none provided.  Selector must be a classname
 *      of a HoistModel, or a custom function may be provided for this argument.  Default false.
 * @returns {ModelSpec}
 *
 *   Note that any model created via createFromConfig, or createDefault, will be considered to be
 *   'owned' by the receiving component and treated as if it were specified using create(). In particular,
 *   this means that the model will be loaded on component mount and destroyed on component unmount.
 */
export function uses(
    selector, {
        optional = false,
        fromContext = true,
        createFromConfig = true,
        createDefault = false
    } = {}) {
    return new UsesSpec(selector, {optional, fromContext, createFromConfig, createDefault});
}


/**
 * @private
 */
export class UsesSpec extends ModelSpec  {

    selector;
    optional;
    fromContext;
    createFromConfig;
    createDefault;

    constructor(selector, flags) {
        super();
        throwIf(!selector, 'Must specify selector in uses().');

        this.selector = selector;
        this.optional = flags.optional;
        this.fromContext = flags.fromContext;
        this.createFromConfig = flags.createFromConfig;
        this.createDefault = flags.createDefault;
    }
}

