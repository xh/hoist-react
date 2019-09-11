/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';

/**
 * Specification for model to be created internally by a HoistComponent
 * for use by itself, and potentially its sub-components.
 *
 * @see hoistComponent()
 */
export class ModelCreateSpec {

    isCreate =  true;

    createFn;
    provide;

    /**
     * @private Applications should call create() instead.
     */
    constructor(spec, flags) {
        if (spec.isHoistModel) {
            throwIf(spec.lookupModel, 'Specified model type must *not* be an instance.  Specify a class name instead.');
            this.createFn = () => new spec();
        } else if (isFunction(spec)) {
            this.createFn = spec;
        }
        throwIf(!this.createFn, 'Must specify type or a creation function for model to be generated.');

        this.provide = flags.provide;
    }
}

/**
 * Specification for model to be created internally by a HoistComponent for use by itself and its sub-components.
 *
 * @param {Class|function} spec - Class of HoistModel to construct, or function to call to create a HoistModel
 * @param {Object} [flags]
 * @param {boolean} [flags.provide] - also place model in context so that contained components may consume.
 *      Default true.
 */
export function create(spec, {provide = true} = {}) {
    return new ModelCreateSpec(spec, {provide});
}