/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {useState, useContext} from 'react';
import {useOnMount, useOnUnmount} from './Mount';
import {isPlainObject} from 'lodash';
import {XH} from '@xh/hoist/core/index';
import {RefreshContext} from '@xh/hoist/core/refresh/RefreshContext';


/**
 * This hook provides support for components that will receive a model from props.
 * The model can be passed as either an already-created class instance or as a config
 * for one to be created internally.
 *
 * Parent components should provide concrete instances of models to their children only if
 * they wish to programmatically access those models to reference data or otherwise
 * manipulate the component using the model's API. Otherwise, models can be created
 * via a config object.  Models that are created internally by the component may be
 * considered "owned" models.  They will be destroyed when the component is unmounted
 * (via destroy()).
 *
 * The model instance is not expected to change for the lifetime of the component. Apps that
 * wish to swap out the model for a mounted component should ensure that a new instance of
 * the component gets mounted. This can be accomplished by setting the component's `key`
 * prop to `model.xhId` (as a model will always return an ID unique to each instance).
 *
 * @param {Object} modelClass - class defining a HoistModel
 * @param {Array} props
 * @returns {Object} - instance of a HoistModel
 */
export function useProvidedModel(modelClass, props) {
    let [state] = useState({instance: null, isOwned: false}),
        propsModel = props.model;

    // Recognize any disalloeddynamic change to the model
    if (state.instance && !state.isOwned && propsModel !== state.instance) throwModelChangeException();

    // if we don't have one, potentially source from props,instantiating if appropriate.
    if (!state.instance && propsModel) {
        if (isPlainObject(propsModel)) {
            if (modelClass) {
                state.instance = new modelClass(propsModel);
                state.isOwned = true;
            } else {
                warnNoModelClassProvided();
            }
        } else {
            if (modelClass && !(propsModel instanceof modelClass)) throwWrongModelClass(this);
            state.instance = propsModel;
            state.isOwned = false;
        }
    }

    useOwnedModelLinker(state.isOwned ? state.instance : null)
    return state.instance;
}

/**
 * This hook provides support for components that define their own model.
 *
 * The model created by this hook will be destroyed when the component is unmounted.
 *
 * @param {(Object|function)} spec - class defining a HoistModel, or a function to
 *      create an instance of a HoistModel.
 * @returns {Object} - instance of a HoistModel.
 */
export function useLocalModel(spec) {
    const [model] = useState(spec.isHoistModel ? () => new spec() : spec);
    useOwnedModelLinker(model);
    return model;
}

/**
 * Link a HoistModel that is owned by a component to the component.
 *
 * Call this hook from the owning component's render method, to wire it
 * to the Component's lifecycle.
 *
 * This includes support for LoadSupport lifecycle, and cleanup when the
 * component is destroyed.
 *
 * @param {Object} model - HoistModel owned by this component.
 */
export function useOwnedModelLinker(model) {
    const loadModel = model && model.isLoadSupport ? model : null,
        context = useContext(RefreshContext);
    useOnMount(() => {
        if (loadModel && context) context.register(loadModel);
        if (loadModel) loadModel.loadAsync();
    });
    useOnUnmount(() => {
        if (loadModel && context) context.unregister(loadModel);
        if (model) XH.safeDestroy(model);
    });
}

//-------------------------------
// Implementation
//--------------------------------
function throwModelChangeException() {
    throw XH.exception(`
                Cannot re-render Component with a different model. If a new model is required, ensure 
                the Component is re-mounted by rendering it with a unique key, e.g. "key: model.xhId".
            `);
}

function throwWrongModelClass(obj) {
    throw XH.exception(`Component requires model of type ${obj.modelClass.constructor}.`);
}

function warnNoModelClassProvided() {
    console.warn('Component class definition must specify a modelClass to support creating models from prop objects.');
}