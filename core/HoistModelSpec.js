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

    mode;
    type;
    createFn;

    provideFromConfig;
    provideFromContext;
    publish;

    /**
     * Construct this object.
     *
     * Not typically called directly by applications -- call the factory functions instead:
     *      provided, local, localAndPublish, providedAndPublish.
     *
     * @param {Object} config
     * @param {string} config.mode - 'local' or 'provided'
     * @param {boolean} [config.publish] - publish model to context so that contained components may consume.
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
        publish = false,

        type,
        createFn,
        provideFromConfig = true,
        provideFromContext = true
    }) {
        createFn = withDefault(createFn, type ? (f) => new type(f) : null);

        throwIf(type && !type.isHoistModel, 'Specified model type must be a HoistModel.');
        throwIf(type && type.lookupModel,
            'Specified model type must *not* be an instance.  Specify a class name instead or use createFn() argument.'
        );
        throwIf(mode === 'local'  && !createFn, 'Must specify type or createFn() for local model.');

        this.type = type;
        this.mode = mode;
        this.createFn = createFn;
        this.publish = publish;
        this.provideFromConfig = provideFromConfig;
        this.provideFromContext = provideFromContext;
    }
}

/**
 * Specify a local model.
 *
 * @param {(Object|class|function)} config - configuration object (see constructor), Model class, or creation function.
 * @returns {HoistModelSpec}
 */
export function local(config) {
    throwIf(!config, 'LocalModel requires a configuration.  Passed value may not have been defined yet.');
    if (config.isHoistModel) {
        config = {type: config};
    } else if (isFunction(config)) {
        config = {createFn: config};
    }
    return new HoistModelSpec({...config, mode: 'local'});
}

/**
 * Specify a localModel that is published to context for consumption by child components.
 * @see local()
 */
export function localAndPublished(config) {
    const ret = local(config);
    ret.publish = true;
    return ret;
}


/**
 * Specify a provided model.
 *
 * @param {(Object|class)} [config] - configuration object (see constructor) or Model class.
 * @returns {HoistModelSpec}
 */
export function provided(config = {}) {
    if (config.isHoistModel) {
        config = {type: config};
    }
    return new HoistModelSpec({...config, mode: 'provided'});
}

/**
 * Specify a providedModel that is published to context for consumption by child components.
 *
 * @see local()
 */
export function providedAndPublished(config) {
    const ret = provided(config);
    ret.publish = true;
    return ret;
}
