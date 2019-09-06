/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {isFunction} from 'lodash';
import {observer} from 'mobx-react-lite';
import {useState, useContext, createElement} from 'react';
import {throwIf} from '@xh/hoist/utils/js';

import {HoistModelSpec} from './HoistModelSpec';
import {useOwnedModelLinker} from './impl/UseOwnedModelLinker';
import {useModelContextWrapper} from './impl/UseModelContextWrapper';
import {ModelLookupContext} from './impl/ModelLookup';

/**
 * Core Hoist utility for defining a functional component.
 *
 * This function always applies the MobX 'observer' behavior to the new component, enabling MobX
 * powered reactivity and auto-re-rendering.  This includes support for forward refs; If the render
 * function provided contains two arguments, the second argument will be considered a ref and
 * React.forwardRef will be applied.
 *
 * This function also supports a 'model' property.  This property defines how a model will be provided to
 * this component, and how this component will in-turn provide this model it to its sub-components.
 *
 * @param {(Object|function)} config - configuration object or render function defining the component
 * @param {function} [config.render] - function defining the component (if config object specified)
 * @param {HoistModelSpec} [config.model] - spec defining the model to be used by the component.
 * @param {string} [config.displayName] - component name for debugging/inspection (if config object specified)
 *
 * @see HoistComponent decorator for a class-based approach to defining a Component in Hoist.
 */
export function hoistComponent(config) {
    if (isFunction(config)) config = {render: config};
    const {render, displayName ='HoistComponent'} = config,
        forwardRef = render.length >= 2;

    const innerComponent = observer(render, {forwardRef});
    let ret = innerComponent;

    // Wrap with model support for components introducing/requiring models.
    let spec = config.model;
    if (spec) {
        spec = spec instanceof HoistModelSpec ? spec : new HoistModelSpec(spec);
        ret = function(props, forwardRef) {
            // if (forwardRef) props = {...props, ref: forwardRef};

            const {model, isOwned, isContext} = useResolvedModel(spec, props);
            useOwnedModelLinker(isOwned && model);
            return useModelContextWrapper(!isContext && model, createElement(innerComponent, props));
        };
    }

    ret.displayName = displayName;
    ret.isHoistComponent = true;

    return ret;
}

/**
 * Create a new Hoist functional component and return an element factory for it.
 *
 * This method is a shortcut for elemFactory(hoistComponent(...)), and is useful for
 * internal usages that do not need to export any references to the Component itself.
 *
 * @see hoistComponent
 * @see elemFactory
 */

export function hoistElemFactory(config) {
    return elemFactory(hoistComponent(config));
}

//-------------------
// Implementation
//------------------
function useResolvedModel(spec, props) {
    const modelLookup = useContext(ModelLookupContext);
    return useState(() => {
        let {model} = props;
        switch (spec.mode) {
            case 'provide':
                if (model && model.isHoistModel) {
                    ensureModelType(model, spec.type);
                    return {model};
                }
                if (model && spec.provideFromConfig) {
                    return {model: spec.createFn(model), isOwned: true};
                }
                if (modelLookup && spec.provideFromContext) {
                    model = modelLookup.lookupModel(spec.type);
                    if (model) return {model, isContext: true};
                }
                break;
            case 'local':
                return {model: spec.createFn(), isOwned: true};
        }
        return {model: null};
    })[0];
}


function ensureModelType(model, type) {
    throwIf(type && !(model instanceof type),
        `Incorrect model type provided to component: expected ${type}.`
    );
}
