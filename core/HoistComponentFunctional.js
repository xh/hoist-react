/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {isFunction, isPlainObject} from 'lodash';
import {observer} from 'mobx-react-lite';
import {useState, useContext, createElement, forwardRef} from 'react';
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
 * this component, and how this component will optionally publish this model to its sub-components via context.
 *
 * @see HoistComponent decorator for a class-based approach to defining a Component in Hoist.
 *
 * @param {(Object|function)} config - configuration object or render function defining the component
 * @param {function} [config.render] - function defining the component (if config object specified)
 * @param {HoistModelSpec} [config.model] - spec defining the model to be used by the component.
 * @param {string} [config.displayName] - component name for debugging/inspection (if config object specified)
 * @returns {*} A functional react component.
 */
export function hoistComponent(config) {
    if (isFunction(config)) config = {render: config};
    const {render, displayName ='HoistComponent'} = config,
        isForwardRef = render.length >= 2;

    const innerComponent = observer(render, {forwardRef: isForwardRef});
    let ret = innerComponent;

    // Wrap with model support for components introducing/requiring models.
    const spec = config.model;
    if (spec) {
        throwIf(!(spec instanceof HoistModelSpec), "'model' config for hoistComponent() must be a HoistModelSpec.");
        ret = (props, ref) => {
            const {model, isOwned} = useResolvedModel(spec, props);
            useOwnedModelLinker(isOwned ? model : null);
            props = isForwardRef ? {...props, ref, model} : {...props, model};
            return useModelContextWrapper(model, createElement(innerComponent, props));
        };
        ret = isForwardRef ? forwardRef(ret) : ret;
    }

    ret.displayName = displayName;
    ret.isHoistComponent = true;

    return ret;
}

/**
 * Alias for hoistCmp
 * @see hoistComponent
 */
export const hoistCmp = hoistComponent;


/**
 * Create a new Hoist functional component and return an element factory for it.
 *
 * This method is a shortcut for elemFactory(hoistComponent(...)), and is useful for
 * internal usages that do not need to export any references to the Component itself.
 *
 * @see hoistComponent
 * @see elemFactory
 *
 * @returns {function} -- an elementFactory function.
 */
export function hoistCmpFactory(config) {
    return elemFactory(hoistCmp(config));
}

/**
 * Create a new Hoist functional component and return it *with* a corresponding
 * element factory for it.
 *
 * @see hoistComponent
 * @see elemFactory
 *
 * @returns {[]} - Array of length 2, with a Component as the first element and
 *      an elementFactory function as the second.
 */
export function hoistCmpAndFactory(config) {
    const ret = hoistCmp(config);
    return [ret, elemFactory(ret)];
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
                if (model && isPlainObject(model) && spec.provideFromConfig) {
                    return {model: spec.createFn(model), isOwned: true};
                }

                if (model) {
                    ensureModelType(model, spec.type);
                    return {model};
                }

                if (modelLookup && spec.provideFromContext) {
                    model = modelLookup.lookupModel(spec.type);
                    if (model) return {model};
                }
                break;
            case 'local':
                return {model: spec.createFn(), isOwned: true};
        }
        return {model: null};
    })[0];
}


function ensureModelType(model, type) {
    throwIf(!model.isHoistModel, 'Model must be a HoistModel');
    throwIf(type && !(model instanceof type),
        `Incorrect model type provided to component: expected ${type}.`
    );
}
