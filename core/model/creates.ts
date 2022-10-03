/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';
import {HoistModel, HoistModelClass, ModelPublishMode, ModelSpec} from './';

/**
 * Returns a ModelSpec to define how a functional HoistComponent should create its primary backing
 * HoistModel. Use this option when your component will create its own model internally, and does
 * *not* expect one to be provided via props or context.
 *
 * The constructed model instance will be provided to the component via props and placed in context
 * for access by all subcomponents.
 *
 * The model created will be considered to be 'owned' by the receiving component. If it implements
 * loading it will be loaded on component mount, and it will always be destroyed on
 * component unmount.
 *
 * @param spec - HoistModel Class to construct, or a function returning a concrete HoistModel instance.
 * @param opts - additional options
 */
export function creates<T extends HoistModel>(
    spec: HoistModelClass<T> | (() => T),
    opts: CreatesOptions
): ModelSpec {
    return new CreatesSpec(spec, opts?.publishMode ?? ModelPublishMode.DEFAULT);
}

export interface CreatesOptions {
    /** Mode for publishing this model to context. {@see ModelPublishMode}.*/
    publishMode?: string;
}


//------------------
// Implementation
//------------------
class CreatesSpec<T extends HoistModel> extends ModelSpec {

    createFn: () => T;

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
