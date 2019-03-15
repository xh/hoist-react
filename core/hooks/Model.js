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
 * This hook provides support for components that will receive a model from props. If
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
    let [model, setModel] = useState(null),
        [modelIsOwned, setModelIsOwned] = useState(false);
    const propsModel = props.model;

    // Return any model instance that has already been provided to the component.
    if (model && !modelIsOwned && propsModel !== model) throwModelChangeException();

    // if we don't have one, potentially source from props,instantiating if appropriate.
    if (!model && propsModel) {
        if (isPlainObject(propsModel)) {
            if (modelClass) {
                setModel(model = new modelClass(propsModel));
                setModelIsOwned(modelIsOwned = true);
            } else {
                warnNoModelClassProvided();
            }
        } else {
            if (modelClass && !(propsModel instanceof modelClass)) throwWrongModelClass(this);
            setModel(model = propsModel);
            setModelIsOwned(modelIsOwned = false);
        }
    }

    useOnUnmount(() => XH.safeDestroy(model));
    useLoadSupportLink(modelIsOwned ? model : null);
    return model;
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
    useOnUnmount(() => XH.safeDestroy(model));
    useLoadSupportLink(model);
    return model;
}

//-------------------------------
// Implementation
//--------------------------------
function useLoadSupportLink(model) {
    model = model && model.isLoadSupport ? model : null;
    const context = useContext(RefreshContext);
    useOnMount(() => {
        if (model && context) context.register(model);
        if (model) model.loadAsync();
    });
    useOnUnmount(() => {
        if (model && context) context.unregister(model);
    });
}

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