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
import {throwIf, withDefault} from '@xh/hoist/utils/js';

import {HoistModelSpec, provided} from './HoistModelSpec';
import {useOwnedModelLinker} from './impl/UseOwnedModelLinker';
import {ModelLookupContext, ModelLookup, modelLookupContextProvider} from './impl/ModelLookup';

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
 * @param {HoistModelSpec} [config.model] - spec defining the model to be used by/ or created by the component.
 *      Defaults to provided() for render functions taking props, otherwise null.   Specify as null for
 *      components that don't require model processing
 * @param {string} [config.displayName] - component name for debugging/inspection (if config object specified)
 * @returns {*} A functional react component.
 */
export function hoistComponent(config) {
    // Pre-process raw function
    if (isFunction(config)) config = {render: config, displayName: config.name};

    const render = config.render,
        displayName = withDefault(config.displayName, 'HoistComponent'),
        argCount = render.length,
        isForwardRef = argCount == 2;

    // Default and validate the modelSpec -- note the default based on presence of props arg.
    const modelSpec = withDefault(config.model, argCount > 0 ? provided() : null);
    throwIf(
        modelSpec && !(modelSpec instanceof HoistModelSpec),
        "'model' for hoistComponent() must be a HoistModelSpec."
    );

    let ret;
    if (modelSpec == null) {
        ret = createBaseComponent(render, isForwardRef);
    } else if (modelSpec.publish) {
        ret = createPublishModelComponent(render, isForwardRef, modelSpec);
    } else {
        ret = createSimpleModelComponent(render, isForwardRef, modelSpec);
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
function createBaseComponent(render, isForwardRef) {
    return observer(render, {forwardRef: isForwardRef});
}

function createSimpleModelComponent(render, isForwardRef, spec) {
    // Just enhance render function -- no new component beyond observer required.
    const enhancedRender = (props, ref) => {
        const [model] = useResolvedModel(spec, props);
        if (model) props = {...props, model};
        return render(props, ref);
    };

    return createBaseComponent(enhancedRender, isForwardRef);
}

function createPublishModelComponent(render, isForwardRef, spec) {
    // To publish context, need to wrap the inner observer with additional wrapper component
    const inner = createBaseComponent(render, isForwardRef);
    const ret = (props, ref) => {
        const [model, modelLookup] = useResolvedModel(spec, props);
        if (isForwardRef || model) {
            props = {...props};
            if (isForwardRef) props.ref = ref;
            if (model) props.model = model;
        }

        const [insertLookup] = useState(() => {
            return model && (!modelLookup || modelLookup.model !== model) ?
                new ModelLookup(model, modelLookup) :
                null;
        });

        const innerElement = createElement(inner, props);
        return insertLookup ? modelLookupContextProvider({value: insertLookup, item: innerElement}) : innerElement;
    };

    return isForwardRef ? forwardRef(ret) : ret;
}

function useResolvedModel(spec, props) {
    const modelLookup = useContext(ModelLookupContext);

    const [{model, isOwned}] = useState(() => {
        if (spec.mode === 'local') {
            return {model: spec.createFn(), isOwned: true};
        }

        if (spec.mode === 'provided') {
            const {model} = props;
            if (model && isPlainObject(model) && spec.provideFromConfig) {
                return {model: spec.createFn(model), isOwned: true};
            }

            if (model) {
                ensureModelType(model, spec.type);
                return {model, isOwned: false};
            }

            if (modelLookup && spec.provideFromContext) {
                return {model: modelLookup.lookupModel(spec.type), isOwned: false};
            }
        }

        return {model: null, isOwned: false};
    });

    useOwnedModelLinker(isOwned ? model : null);

    return [model, modelLookup];
}


function ensureModelType(model, type) {
    throwIf(!model.isHoistModel, 'Model must be a HoistModel');
    throwIf(type && !(model instanceof type),
        `Incorrect model type provided to component: expected ${type}.`
    );
}
