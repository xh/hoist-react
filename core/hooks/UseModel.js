/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {useState, useContext} from 'react';
import {ModelLookupContext} from '../impl/ModelLookup';

/**
 * Hook to allow a component to access a HoistModel provided by an ancestor component, or props.  A model
 * set directly on props will take precedence.
 *
 * The model instance is not expected to change for the lifetime of the component. Apps that wish
 * to swap out the model for a mounted component should ensure that a new instance of the component
 * gets mounted. This can be done by rendering the component with a `key` prop set to `model.xhId`, as
 * HoistModels always return IDs unique to each instance.
 *
 * @param {(Class|string)} [selector] - class or name of mixin applied to class of
 *      model to be returned.  If not provided the 'closest' inherited model will be returned.
 * @param {Array} [props] - provide to do initial search in props.
 *
 * @returns model or null if no matching model found.
 */
export function useModel(selector, props) {
    const modelLookup = useContext(ModelLookupContext),
        [ret] = useState(() => {
            if (props) {
                const {model} = props;
                // TODO: validate with selector here?
                if (model && model.isHoistModel) return model;
            }
            if (modelLookup) {
                return modelLookup.lookupModel(selector);
            }
            return null;
        });

    return ret;
}