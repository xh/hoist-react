/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {isFunction, isPlainObject} from 'lodash';
import {useObserver} from 'mobx-react-lite';
import {useState, useContext, createElement, forwardRef, memo} from 'react';
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
    // 0) Pre-process/parse args.
    if (isFunction(config)) config = {render: config, displayName: config.name};

    const render = config.render,
        displayName = withDefault(config.displayName, 'HoistComponent'),
        argCount = render.length,
        isForwardRef = argCount == 2;

    // 1) Default and validate the modelSpec -- note the default based on presence of props arg.
    const modelSpec = withDefault(config.model, argCount > 0 ? provided() : null);
    throwIf(
        modelSpec && !(modelSpec instanceof HoistModelSpec),
        "'model' for hoistComponent() must be a HoistModelSpec."
    );

    // 2) Decorate with behaviors: useObserver, model handling, forwardRef, memo
    // Note that we don't use "observer" which is just useObserver + memo + isForwardRef
    // Its confusing and gives us less fine-grained control.

    // Questions -- do we want to allow customizability of observer decoration?  memo decoration?
    // We have a lot of objects that render the default memo() ineffective by taking object props
    // (e.g. icons, agSpec, model spec, etc)
    let ret = (props, ref) => useObserver(() => render(props, ref));

    if (modelSpec) {
        ret = modelSpec.publish ?
            wrapWithPublishModel(ret, modelSpec):
            wrapWithSimpleModel(ret,  modelSpec);
    }
    if (isForwardRef) {
        ret = forwardRef(ret);
        ret.displayName = displayName+'Inner';
    }
    ret = memo(ret);

    // 3) Mark and return
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
function wrapWithSimpleModel(render, spec) {
    return (props, ref) => {
        const [model] = useResolvedModel(spec, props);
        if (model) props = {...props, model};
        return render(props, ref);
    };
}

function wrapWithPublishModel(render, spec) {
    return (props, ref) => {
        const [model, lookup] = useResolvedModel(spec, props);
        const [newLookup] = useState(
            () => model && (!lookup || lookup.model !== model) ? new ModelLookup(model, lookup) : null
        );
        if (model) props = {...props, model};
        const rendering = render(props, ref);
        return newLookup ? modelLookupContextProvider({value: newLookup, item: rendering}) : rendering;
    };
}

// To publish context, to *self* and children need to wrap a new inner anonymous component with the context.
// DO WE NEED THIS COMPLEXITY?
function wrapWithPublishModelComplex(render, isForwardRef, spec) {
    const inner = isForwardRef ? forwardRef(render) : render;
    return (props, ref) => {
        const [model, lookup] = useResolvedModel(spec, props);
        if (isForwardRef || model) {
            props = {...props};
            if (isForwardRef) props.ref = ref;
            if (model) props.model = model;
        }

        const [newLookup] = useState(
            () => model && (!lookup || lookup.model !== model) ? new ModelLookup(model, lookup) : null
        );

        const innerElement = createElement(inner, props);
        return newLookup ? modelLookupContextProvider({value: newLookup, item: innerElement}) : innerElement;
    };
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
