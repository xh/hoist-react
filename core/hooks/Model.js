/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {useState, useContext, useEffect} from 'react';
import {isPlainObject} from 'lodash';
import {XH} from '@xh/hoist/core/index';
import {RefreshContext} from '@xh/hoist/core/refresh/RefreshContext';


/**
 * Hook supporting components that will receive a model from props. The model can be passed as
 * either an already-created class instance or as a config for one to be created internally.
 *
 * Models that are created internally by the component may be considered "owned" models. This hook
 * will ensure an owned model's destroy() method is called when its component is unmounted.
 *
 * Parent components should provide concrete instances of models to their children only if they wish
 * to programmatically access those models to reference data or otherwise manipulate the component
 * using the model's API. Otherwise, models should be specified via a config object to take
 * advantage of the auto-cleanup process.
 *
 * The model instance is not expected to change for the lifetime of the component. Apps that wish
 * to swap out the model for a mounted component should ensure that a new instance of the component
 * gets mounted. This can be done by setting the component's `key` prop to `model.xhId`, as
 * HoistModels always return IDs unique to each instance.
 *
 * @param {Object} modelClass - class defining a HoistModel
 * @param {Array} props
 * @returns {Object} - instance of a HoistModel
 */
export function useProvidedModel(modelClass, props) {
    let [state] = useState({instance: null, isOwned: false}),
        propsModel = props.model;

    // Recognize any disallowed dynamic change to the model
    if (state.instance && !state.isOwned && propsModel !== state.instance) throwModelChangeException();

    // If we don't yet have a model, potentially source from props, instantiating if appropriate.
    if (!state.instance && propsModel) {
        if (isPlainObject(propsModel)) {
            if (modelClass) {
                state.instance = new modelClass(propsModel);
                state.isOwned = true;
            } else {
                warnNoModelClassProvided();
            }
        } else {
            if (modelClass && !(propsModel instanceof modelClass)) throwWrongModelClass(modelClass);
            state.instance = propsModel;
            state.isOwned = false;
        }
    }

    const ownedModel = state.isOwned ? state.instance : null;
    useLoadSupportLinker(ownedModel);
    useOwnedModelLinker(ownedModel);
    return state.instance;
}

/**
 * Hook supporting components that define their own model.
 *
 * Will instantiate a provided model class or factory function on first render, then pass to
 * useOwnedModelLinker() for lifecycle and optional loadSupport integrations.
 *
 * @param {(Object|function)} spec - class defining a HoistModel or a function that creates and
 *      returns an instance of a HoistModel.
 * @returns {Object} - instance of a HoistModel.
 */
export function useLocalModel(spec) {
    const [model] = useState(spec.isHoistModel ? () => new spec() : spec);
    useLoadSupportLinker(model);
    useOwnedModelLinker(model);
    return model;
}

/**
 * Integrate a HoistModel owned by a component into the component's lifecycle, enabling support for
 * the LoadSupport lifecycle (if enabled on the model).
 *
 * @param {Object} model - HoistModel owned by this component.  If null, or does not implement
 *      LoadSupport, this hook will be a no-op.
 */
export function useLoadSupportLinker(model) {
    model = model && model.isLoadSupport ? model : null;
    const context = useContext(RefreshContext);
    useEffect(() => {
        if (model) {
            model.loadAsync();
            if (context) {
                context.register(model);
                return () => context.unregister(model);
            }
        }
    }, [model, context]);
}

/**
 * Hook to generally link a Component to its owned Model.
 *
 * @param model - HoistModel owned by this component, If null this hook will be a no-op;
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
//-------------------------------
function throwModelChangeException() {
    throw XH.exception(`
                Cannot re-render Component with a different model. If a new model is required, ensure 
                the Component is re-mounted by rendering it with a unique key, e.g. "key: model.xhId".
            `);
}

function throwWrongModelClass(modelClass) {
    throw XH.exception(`Incorrect model type provided to component: expected ${modelClass.prototype.constructor.name}.`);
}

function warnNoModelClassProvided() {
    console.warn('Component class definition must specify a modelClass to support creating models from prop objects.');
}