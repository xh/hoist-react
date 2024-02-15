/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {Thunkable} from './../types/Types';
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';
import {HoistModel, HoistModelClass, ModelPublishMode} from './';

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
    spec: Thunkable<HoistModelClass<T>> | (() => T),
    opts: CreatesOptions = {}
): CreatesSpec<T> {
    return new CreatesSpec(spec, opts?.publishMode ?? 'default');
}

export interface CreatesOptions {
    /** Mode for publishing this model to context. */
    publishMode?: ModelPublishMode;
}

export class CreatesSpec<T extends HoistModel> {
    fromContext: boolean = false;
    optional: boolean = false;
    publishMode: ModelPublishMode;
    createFn: () => T;

    constructor(spec, publishMode: ModelPublishMode) {
        this.publishMode = publishMode;
        if (spec.isHoistModel) {
            throwIf(
                spec.lookupModel,
                'Specified model type must *not* be an instance. Specify a class name instead.'
            );
            this.createFn = () => spec;
        } else if (isFunction(spec)) {
            this.createFn = spec;
        }
        throwIf(
            !this.createFn,
            'Must specify type or a creation function for model to be generated.'
        );
    }
}
