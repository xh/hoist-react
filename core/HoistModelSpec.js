/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {withDefault, throwIf} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';

/**
 * Specification for model to be used by a HoistComponent.
 *
 * @see hoistComponent()
 */
export class HoistModelSpec {
    type;
    mode;
    createFn;

    provideFromConfig;
    provideFromContext;

    /**
     * @param {Object} config
     * @param {string} config.mode - 'local' or 'provide'
     * @param {Object} [config.type] - type of model.  Must be a class decorated with HoistModel.
     * @param {function} [config.createFn] - function to be used to create the model.  If model being created from
     *      a provided config, this will be passed to this function. Defaults to the model type constructor.
     * @param {boolean} [config.provideFromContext] - true to accept a provided model from context, as well as props. Default to true.
     * @param {boolean} [config.provideFromConfig] - true to accept provided model from config, and generate a model instance
     *      locally.  Note that any model created in this  way will be considered to be 'owned' by the receiving
     *      component, and will be loaded and destroyed as if it were local. Default to true.
     */
    constructor({
        mode,
        type,
        createFn,
        provideFromConfig = true,
        provideFromContext = true
    }) {
        createFn = withDefault(createFn, type ? (f) => new type(f) : null);

        throwIf(type && !type.isHoistModel, 'Specified model type must be an instance of HoistModel.');
        throwIf(mode === 'local'  && !createFn, 'Must specify type or createFn() for local model.');

        this.type = type;
        this.mode = mode;
        this.createFn = createFn;
        this.provideFromConfig = provideFromConfig;
        this.provideFromContext = provideFromContext;
    }
}

/**
 * Create a specification for a local model.
 *
 * @param {(Object|function)} config - configuration object (see constructor), type, or creation function.
 * @returns {HoistModelSpec}
 */
export function localModel(config) {
    throwIf(!config, 'LocalModel requires a configuration.  Passed value may not have been defined yet.');
    if (config.isHoistModel) {
        config = {type: config};
    } else if (isFunction(config)) {
        config = {createFn: config};
    }
    return new HoistModelSpec({mode: 'local', ...config});
}


/**
 * Create a specification for a provided model.
 *
 * @param {(Object|function)} [config] - configuration object (see constructor) or type,
 * @returns {HoistModelSpec}
 */
export function providedModel(config = {}) {
    if (config.isHoistModel) {
        config = {type: config};
    }
    return new HoistModelSpec({mode: 'provide', ...config});
}