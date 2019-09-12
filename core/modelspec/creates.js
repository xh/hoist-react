/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';
import {ModelSpec} from './ModelSpec';


/**
 * Specification for a primary model to be created for a HoistComponent and its sub-components.   The resolved model
 * will be provided to the actual component in props and placed in context for access by all sub-components.
 *
 * The model created will be considered to be 'owned' by the receiving component.  If it implements @LoadSupport it
 * will be loaded on component mount, and it will always be destroyed on component unmount.
 *
 * @param {Class|function} spec - Class of HoistModel to construct, or function to call to create a HoistModel.
 * @returns {ModelSpec}
 */
export function creates(spec) {
    return new CreatesSpec(spec);
}

/**
 * @private
 */
export class CreatesSpec extends ModelSpec {

    createFn;

    constructor(spec) {
        super();
        if (spec.isHoistModel) {
            throwIf(spec.lookupModel, 'Specified model type must *not* be an instance.  Specify a class name instead.');
            this.createFn = () => new spec();
        } else if (isFunction(spec)) {
            this.createFn = spec;
        }
        throwIf(!this.createFn, 'Must specify type or a creation function for model to be generated.');
    }
}
