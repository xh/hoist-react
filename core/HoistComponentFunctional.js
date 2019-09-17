/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {isFunction, isPlainObject, isString} from 'lodash';
import {useObserver} from 'mobx-react';
import {forwardRef, memo, useContext, useDebugValue, useState} from 'react';
import {
    ModelLookup,
    ModelLookupContext,
    modelLookupContextProvider,
    useOwnedModelLinker
} from './impl';
import {CreatesSpec, ModelSpec, uses} from './modelspec';
import classNames from 'classnames';

/**
 * Hoist utility for defining functional components. This is the primary method for creating
 * components for use in Hoist applications. Accepts either a render function (directly) or a
 * configuration object to specify that function and additional options, as described below.
 *
 * The primary additional config option is `model`. It specifies how a backing HoistModel will be
 * provided to / created by this component and if the component should publish its model to any
 * sub-components via context.
 *
 * By default, this utility applies the MobX 'observer' behavior on the returned component,
 * enabling MobX-powered reactivity and auto-re-rendering.
 *
 * Forward refs (@link https://reactjs.org/docs/forwarding-refs.html) are supported by specifying a
 * render function that accepts two arguments. In that case, the second arg will be considered a
 * ref, and this utility will apply `React.forwardRef` as required.
 *
 * @see hoistCmp - a shorthand alias to this function.
 * @see HoistComponent - decorator for an alternate, class-based approach to defining Components.
 *
 * @param {(Object|function)} config - config object, or a render function defining the component.
 * @param {function} [config.render] - render function defining the component.
 * @param {ModelSpec} [config.model] - spec defining the model to be rendered by this component.
 *      Specify as false for components that don't require a primary model. Otherwise,
 *      {@see uses()} and {@see creates()} - these two factory functions can be used to create an
 *      appropriate spec for either externally-provided or internally-created models. Defaults to
 *      `uses('*')` for render functions taking props, otherwise false.
 * @param {String} [config.className] - base css classname for this component.  Will be combined with any
 *      className in props, and the combined string  will be made available to the render function via props.
 * @param {string} [config.displayName] - component name for debugging/inspection.
 * @param {boolean} [config.memo] - true (default) to wrap component in a call to `React.memo()`.
 *      Components that are known to be unable to make effective use of memo (e.g. container
 *      components) may set this to `false`. Not typically set by application code.
 * @param {boolean} [config.observer] - true (default) to enable MobX-powered reactivity via the
 *      `useObserver()` hook from mobx-react. Components that are known to dereference no
 *      observable state may set this to `false`. Not typically set by application code.
 * @returns {function} - a functional Component for use within Hoist apps.
 *
 * This function also has two convenience "sub-functions" that are properties of it:
 *
 *   hoistComponent.factory - returns an elemFactory for the newly defined component, instead of the component itself.
 *   hoistComponent.withFactory - returns a 2-element list containing both the newly defined component and
 *          an elemFactory for it.
 */
export function hoistComponent(config) {
    // 0) Pre-process/parse args.
    if (isFunction(config)) config = {render: config, displayName: config.name};

    const render = config.render,
        argCount = render.length,
        className = config.className,
        displayName = config.displayName ? config.displayName : 'HoistCmp',
        isMemo = withDefault(config.memo, true),
        isObserver = withDefault(config.observer, true),
        isForwardRef = argCount == 2;

    // 1) Default and validate the modelSpec -- note the default based on presence of props arg.
    const modelSpec = withDefault(config.model, argCount > 0 ? uses('*') : null);
    throwIf(
        modelSpec && !(modelSpec instanceof ModelSpec),
        "The 'model' config passed to hoistComponent() is incorrectly specified: provide a spec returned by either uses() or creates()."
    );

    // 2) Decorate with behaviors
    let ret = render;
    if (isObserver) {
        ret = (props, ref) => useObserver(() => render(props, ref));
    }
    if (modelSpec) {
        ret = wrapWithModel(ret,  modelSpec, displayName);
    }
    if (className) {
        ret = wrapWithClassName(ret, className);
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
 * A (satisfyingly short) alias for {@see hoistComponent}.
 */
export const hoistCmp = hoistComponent;

/**
 * Create a new Hoist functional component and return an element factory for it.
 *
 * This method is a shortcut for `elemFactory(hoistComponent(...))`, and is intended for use by
 * apps written using elemFactory (vs. JSX) that do not need to export any direct references to the
 * Component itself.
 *
 * @returns {function} - an elementFactory function for use within parent comp render() functions.
 */
hoistComponent.factory = (config) => {
    return elemFactory(hoistComponent(config));
};

/**
 * Create a new Hoist functional component and return it *and* a corresponding element factory.
 *
 * @returns {[]} - two-element Array, with the Component as the first element and its
 *      elementFactory function as the second.
 */
hoistComponent.withFactory = (config) =>  {
    const ret = hoistComponent(config);
    return [ret, elemFactory(ret)];
};


//------------------------
// Implementation
//------------------------
function wrapWithClassName(render, baseName) {
    return (props, ref) => {
        const className = classNames(baseName, props.className);
        props = enhanceProps(props, 'className', className);
        return render(props, ref);
    };
}

function wrapWithModel(render, spec, displayName) {
    const wrap = (spec.fromContext || spec.toContext) ? wrapWithContextModel : wrapWithSimpleModel;
    return wrap(render, spec, displayName);
}

function wrapWithContextModel(render, spec, displayName) {
    return (props, ref) => {
        const lookup = useContext(ModelLookupContext);
        const model = useResolvedModel(spec, props, lookup, displayName);
        const [newLookup] = useState(
            () => model && spec.toContext && (!lookup || lookup.model !== model) ? new ModelLookup(model, lookup) : null
        );
        if (model && model !== props.model) props = enhanceProps(props, 'model', model);
        const rendering = render(props, ref);
        return newLookup ? modelLookupContextProvider({value: newLookup, item: rendering}) : rendering;
    };
}

function wrapWithSimpleModel(render, spec, displayName) {
    return (props, ref) => {
        const model = useResolvedModel(spec, props, null, displayName);
        if (model && model !== props.model) props = enhanceProps(props, 'model', model);
        return render(props, ref);
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
    const create = spec.createDefault;
    if (create) {
        const model = (isFunction(create) ? create() : new selector());
        return {model, isOwned: true};
    }

    //  Component are encouraged to handle a missing model gently. Could also be error
    console.warn(
        `Unable to find specified model for '${displayName}'. Expected: ${formatSelector(selector)}`
    );
    return {model: null, isOwned: false};
}

function formatSelector(selector) {
    if (isString(selector)) return selector;
    if (isFunction(selector)  && selector.isHoistModel) return selector.name;
    return '[Selector]';
}

function enhanceProps(props, name, value) {
    if (!Object.isExtensible(props)) {
        props = {...props};
    }
    props[name] = value;
    return props;
}