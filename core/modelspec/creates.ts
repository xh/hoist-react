/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';
import {ModelPublishMode, ModelSpec} from './ModelSpec';
import {HoistModel, HoistModelClass} from '../HoistModel';

/**
 * Returns a ModelSpec to define how a functional HoistComponent should create its primary backing
 * HoistModel. Use this option when your component will create its own model internally, and does
 * *not* expect one to be provided via props or context.
 *
 * The constructed model instance will be provided to the component via props and placed in context
 * for access by all sub-components.
 *
 * The model created will be considered to be 'owned' by the receiving component. If it implements
 * loading it will be loaded on component mount, and it will always be destroyed on
 * component unmount.
 *
 * @param spec - HoistModel Class to construct, or a function returning a concrete HoistModel instance.
 * @param {Object} [flags]
 * @param {ModelPublishMode} [flags.publishMode] - mode for publishing this model to context.
 */
export function creates(
    spec: HoistModelClass | (() => HoistModel),
    {publishMode = ModelPublishMode.DEFAULT} = {}
): ModelSpec {
    return new CreatesSpec(spec, publishMode);
}

/** @private */
export class CreatesSpec extends ModelSpec {

    createFn;

    constructor(spec, publishMode) {
        super(false, publishMode, false);
        if (spec.isHoistModel) {
            throwIf(spec.lookupModel, 'Specified model type must *not* be an instance. Specify a class name instead.');
            this.createFn = () => spec;
        } else if (isFunction(spec)) {
            this.createFn = spec;
        }
        throwIf(!this.createFn, 'Must specify type or a creation function for model to be generated.');
    }
}
