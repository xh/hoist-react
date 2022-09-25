/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';
import {ModelPublishMode, ModelSpec} from './ModelSpec';
import {isFunction, isString} from 'lodash';

/**
 * Returns a ModelSpec to define how a functional HoistComponent should source its primary backing
 * HoistModel from props or context. Use this option when your component expects its parent to
 * provide its model (or a config to create one).
 *
 * Hoist will look for a model instance in either props or context. If required and so specified,
 * the model can also be created on demand from either a config passed via props or its class defaults.
 *
 * The resolved/constructed model instance will be provided to the component via props and placed
 * in context for access by all sub-components.
 *
 * Note that any model created via `createFromConfig` or `createDefault` will be considered to be
 * 'owned' by the receiving component and treated as if it were specified using `create()`: if it
 * implements loading it will be loaded on component mount, and it will always be destroyed
 * on component unmount.
 *
 * @param {ModelSelector} selector - specification of Model to use, or '*' (default) to accept the
 *      closest context model, without specifying any particular class.
 * @param {Object} [flags]
 * @param {boolean} [flags.fromContext] - true (default) to look for a suitable model in context if
 *      not sourced via props.
 * @param {ModelPublishMode} [flags.publishMode] - mode for publishing this model to context.
 * @param {boolean} [flags.createFromConfig] - true (default) to accept model config from props and
 *      construct an instance on-demand. Selector must be a HoistModel Class.
 * @param {(boolean|function)} [flags.createDefault] - true to create a model if none provided.
 *      Selector must be a HoistModel Class, or a custom function may be provided for this argument.
 * @param {boolean} [flags.optional] - true to specify a model that is optional.  Default false.
 * @returns {ModelSpec}
 */
export function uses(
    selector, {
        fromContext = true,
        publishMode = ModelPublishMode.DEFAULT,
        createFromConfig = true,
        createDefault = false,
        optional = false
    } = {}) {
    return new UsesSpec(selector, fromContext, publishMode, createFromConfig, createDefault, optional);
}


/**
 * Ensure an object is a ModelSelector, or throw.
 *
 * @param {Object} s
 */
export function ensureIsSelector(s) {
    const isFunc = isFunction(s),
        msg = 'A valid subclass of HoistModel, a function, or "*" is required as a selector.' +
            'Functional form may take a HoistModel and return a boolean, or take no arguments and ' +
            'return a subclass of HoistModel.';

    // Basic check for non-functions
    throwIf(!isFunc && s !== '*', msg);

    // For functions, can only validate that if it is a class constructor it's a HoistModel
    throwIf(isFunc && s.prototype && !s.isHoistModel, msg);
}

/**
 * Format a ModelSelector for debugging purposes.
 *
 * @param {ModelSelector} selector
 * @returns {string}
 */
export function formatSelector(selector) {
    if (isString(selector)) return selector;
    if (isFunction(selector)) {
        if (selector.isHoistModel) return selector.name;
        try {
            selector = selector();
        } catch (e) {
        }
        if (selector.isHoistModel) return '() => ' + selector.name;
    }
    return '[Selector]';
}


/** @private */
export class UsesSpec extends ModelSpec {

    selector;
    createFromConfig;
    createDefault;

    constructor(selector, fromContext, publishMode, createFromConfig, createDefault, optional) {
        super(fromContext, publishMode, optional);

        ensureIsSelector(selector);

        this.selector = selector;
        this.createFromConfig = createFromConfig;
        this.createDefault = createDefault;
    }
}