/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {isFunction, isString, isPlainObject} from 'lodash';
import {useObserver} from 'mobx-react';
import {useState, useContext, forwardRef, memo, useDebugValue} from 'react';
import {throwIf, withDefault} from '@xh/hoist/utils/js';

import {ModelSpec, CreatesSpec, uses} from './modelspec';
import {ModelLookup, modelLookupContextProvider, ModelLookupContext, useOwnedModelLinker} from './impl';

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
 * @param {ModelSpec} [config.model] - spec defining the model to be rendered by this component.
 *        @see uses() and creates() for factories that may be used to define this spec.  Specify as false for
 *        components that don't require model access. Defaults to uses('*') for render functions taking props,
 *        otherwise false.
 * @param {boolean} [config.memo] - wrap returned component in React.memo()?  True by default. Components that
 *      are known to be unable to make effective use of memo (e.g. container components) may set this to *false*.
 *      Not typically set by application code.
 * @param {boolean} [config.observer] - Make component reactive via MobX useObserver(). True by default. Components that
 *      are known to dereference no observable state may set this to *false*.
 *      Not typically set by application code.
 * @param {string} [config.displayName] - component name for debugging/inspection (if config object specified)
 *
 * @returns {*} A functional React component.
 */
export function hoistComponent(config) {
    // 0) Pre-process/parse args.
    if (isFunction(config)) config = {render: config, displayName: config.name};

    const render = config.render,
        argCount = render.length,
        displayName = config.displayName ? config.displayName : 'HoistCmp',
        isMemo = withDefault(config.memo, true),
        isObserver = withDefault(config.observer, true),
        isForwardRef = argCount == 2;

    // 1) Default and validate the modelSpec -- note the default based on presence of props arg.
    const modelSpec = withDefault(config.model, argCount > 0 ? uses('*', {optional: true}) : null);
    throwIf(
        modelSpec && !(modelSpec instanceof ModelSpec),
        "'model' for hoistComponent() is incorrectly specified.  Specify with uses() or creates()"
    );

    // 2) Decorate with behaviors
    let ret = render;
    if (isObserver) {
        ret = (props, ref) => useObserver(() => render(props, ref));
    }
    if (modelSpec) {
        ret = wrapWithModelSupport(ret, modelSpec, displayName);
    }
    if (isForwardRef) {
        ret = forwardRef(ret);
    }
    if (isMemo) {
        ret = memo(ret);
    }

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
function wrapWithModelSupport(render, spec, displayName) {
    return (props, ref) => {
        const lookup = useContext(ModelLookupContext);
        const model = useResolvedModel(spec, props, lookup, displayName);
        const [newLookup] = useState(
            () => model && (!lookup || lookup.model !== model) ? new ModelLookup(model, lookup) : null
        );
        if (model) props = {...props, model};
        const rendering = render(props, ref);
        return newLookup ? modelLookupContextProvider({value: newLookup, item: rendering}) : rendering;
    };
}

function useResolvedModel(spec, props, lookup, displayName) {
    const [{model, isOwned}] = useState(() => {
        return (spec instanceof CreatesSpec) ? createModel(spec) : lookupModel(spec, props, lookup, displayName);
    });
    useOwnedModelLinker(isOwned ? model : null);
    useDebugValue(model, m => m.constructor.name + (isOwned ? ' (owned)' : ''));

    return model;
}

function createModel(spec) {
    return {model: spec.createFn(), isOwned: true};
}

function lookupModel(spec, props, modelLookup, displayName) {
    const {model} = props,
        {selector} = spec;

    // 1) props - config
    if (model && isPlainObject(model) && spec.createFromConfig) {
        return {model: new selector(model), isOwned: true};
    }

    // 2) props - instance
    if (model) {
        throwIf(!model.isHoistModel, `Model for '${displayName}' must be a HoistModel.`);
        throwIf(!model.matchesSelector(selector),
            `Incorrect model passed to '${displayName}'. Expected: ${formatSelector(selector)} Received: ${model.constructor.name}`
        );
        return {model, isOwned: false};
    }

    // 3) context
    if (modelLookup && spec.fromContext) {
        return {model: modelLookup.lookupModel(selector), isOwned: false};
    }

    // 4) default create
    const create = spec.defaultCreate;
    if (create) {
        const model = (isFunction(create) ? create() : new selector());
        return {model, isOwned: true};
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