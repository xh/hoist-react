/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {isFunction, isString, isPlainObject} from 'lodash';
import {useObserver} from 'mobx-react-lite';
import {useState, useContext, forwardRef, memo} from 'react';
import {throwIf, withDefault} from '@xh/hoist/utils/js';

import {receive} from './modelspec/ModelReceiveSpec';
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
 * @param {ModelCreateSpec | ModelReceiveSpec} [config.model] - spec defining the model to be used by/ or created by the component.
 *      Defaults to receive('*') for render functions taking props, otherwise null.   Specify as null for
 *      components that don't require model processing at all.
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
    const modelSpec = withDefault(config.model, argCount > 0 ? receive('*', {optional: true, provide: false}) : null);
    throwIf(
        modelSpec && !(modelSpec.isCreate || modelSpec.isReceive),
        "'model' for hoistComponent() is incorrectly specified.  Use create() or receive()"
    );

    // 2) Decorate with behaviors: useObserver, model handling, forwardRef, memo
    // Note that we don't use "observer" which is just useObserver + memo + isForwardRef
    // Its confusing and gives us less fine-grained control.

    // Questions -- do we want to allow customizability of observer decoration?  memo decoration?
    // We have a lot of objects that render the default memo() ineffective by taking object props
    // (e.g. icons, agSpec, model spec, etc)
    let ret = (props, ref) => useObserver(() => render(props, ref));

    if (modelSpec) {
        ret = modelSpec.provide ?
            wrapWithProvidedModel(ret, modelSpec, displayName):
            wrapWithLocalModel(ret,  modelSpec, displayName);
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
function wrapWithLocalModel(render, spec, displayName) {
    return (props, ref) => {
        const [model] = useResolvedModel(spec, props, displayName);
        if (model) props = {...props, model};
        return render(props, ref);
    };
}

function wrapWithProvidedModel(render, spec, displayName) {
    return (props, ref) => {
        const [model, lookup] = useResolvedModel(spec, props, displayName);
        const [newLookup] = useState(
            () => model && (!lookup || lookup.model !== model) ? new ModelLookup(model, lookup) : null
        );
        if (model) props = {...props, model};
        const rendering = render(props, ref);
        return newLookup ? modelLookupContextProvider({value: newLookup, item: rendering}) : rendering;
    };
}

function useResolvedModel(spec, props, displayName) {
    const modelLookup = useContext(ModelLookupContext);
    const [{model, isOwned}] = useState(() => {
        return spec.isCreate ? createModel(spec) : lookupModel(spec, props, modelLookup, displayName);
    });
    useOwnedModelLinker(isOwned ? model : null);

    return [model, modelLookup];
}

function createModel(spec) {
    return {model: spec.createFn(), isOwned: true};
}

function lookupModel(spec, props, modelLookup, displayName) {
    const {model} = props,
        {selector} = spec;
    if (model && isPlainObject(model) && spec.fromConfig) {
        return {model: new selector(model), isOwned: true};
    }

    if (model) {
        throwIf(!model.isHoistModel, `Model for '${displayName}' must be a HoistModel.`);
        throwIf(!model.matchesSelector(selector),
            `Incorrect model received for '${displayName}'. Expected: ${formatSelector(selector)} Received: ${model.constructor.name}`
        );
        return {model, isOwned: false};
    }

    if (modelLookup && spec.fromContext) {
        return {model: modelLookup.lookupModel(selector), isOwned: false};
    }

    throwIf(!spec.optional,
        `Unable to find specified model for '${displayName}'. Expected: ${formatSelector(selector)}`
    );
    return {model: null, isOwned: false};
}

function formatSelector(selector) {
    if (isString(selector)) return selector;
    if (isFunction(selector)  && selector.isHoistModel) return selector.name;
    return '[Selector]';
}