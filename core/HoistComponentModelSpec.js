/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {withDefault, throwIf} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';

/**
 * Specification for model in hoistComponent.
 *
 * @see hoistComponent()
 */
export class HoistComponentModelSpec {
    type;
    mode;
    createFn;

    provideFromConfig;
    provideFromContext;

    /**
     * @param {Object} config
     * @param {Object} [config.type] - type of model.  Must be a class decorated with HoistModel.
     * @param {string} config.mode - 'local' or 'provide'
     * @param {function} [config.createFn] - function to be used to create the model.  If model being created from
     *      a provided config, this will be passed to this function. Defaults to the model type constructor.
     * @param {boolean} [provideFromContext] - true to accept a provided model from context, as well as props. Default to true.
     * @param {boolean} [provideFromConfig] - true to accept provided model from config, and generate a model instance
     *      locally.  Note that any model created in this  way will be considered to be 'owned' by the receiving
     *      component, and will be loaded and destroyed as if it were local. Default to false.
     */
    constructor(config) {
        throwIf(config.type && !config.type.isHoistModel, 'Specified model type must be an instance of HoistModel.');
        this.type = config.type;
        this.mode = config.mode;
        this.createFn = withDefault(config.createFn, this.type ? (config) => new this.type(config) : null);
        this.provideFromConfig = withDefault(config.provideFromConfig, true);
        this.provideFromContext = withDefault(config.provideFromConfig, true);
    }
}

/**
 * Create a specification for a local model
 *
 * @param {Object|function} - config (see constructor), type, or creation function.
 * @returns {HoistComponentModelSpec}
 */
export function localModel(config) {
    if (isFunction(config)) config = {createFn: config};
    if (config.isHoistModel) config = {type: config};
    return new HoistComponentModelSpec({mode: 'local', ...config});
}


/**
 * Create a specification for a provided  model
 *
 * @param {Object|function} - config (see constructor) or type,
 * @returns {HoistComponentModelSpec}
 */
export function providedModel(config) {
    if (config.isHoistModel) config = {type: config};
    return new HoistComponentModelSpec({mode: 'provide', ...config});
}