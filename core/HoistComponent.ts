/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {
    CreatesSpec,
    UsesSpec,
    HoistProps,
    DefaultHoistProps,
    StandardElementFactory,
    elementFactory,
    ContainerElementFactory,
    containerElementFactory,
    ElementFactory
} from './';
import {
    useModelLinker,
    localModelContext,
    ModelLookup,
    ModelLookupContext,
    modelLookupContextProvider,
    ModelSpec,
    uses,
    formatSelector,
    HoistModel
} from './model';
import {apiDeprecated, throwIf, warnIf, withDefault} from '@xh/hoist/utils/js';
import {useOnMount, getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isFunction, isPlainObject, isObject} from 'lodash';
import {observer} from '../mobx';
import {
    ForwardedRef,
    forwardRef,
    FC,
    memo,
    ReactNode,
    useContext,
    useDebugValue,
    useState
} from 'react';

/**
 * Configuration for creating a Component.  May be specified either as a render function,
 * or an object containing a render function and associated metadata.
 */
export type ComponentConfig<P extends HoistProps> =
   ((props: P, ref?: ForwardedRef<any>) => ReactNode) |
    {

    /** Render function defining the component. */
    render(props: P, ref?: ForwardedRef<any>): ReactNode;

    /**
     * Spec defining the model to be rendered by this component.
     * Specify as false for components that don't require a primary model. Otherwise, set to the
     * return of {@link uses} or {@link creates} - these factory functions will create a spec for
     * either externally-provided or internally-created models. Defaults to `uses('*')`.
     */
    model?: ModelSpec<P['model']>|boolean;

    /**
     * Base CSS class for this component. Will be combined with any className
     * in props, with the combined string passed into render as a prop.
     */
    className?: string;

    /** Component name for debugging/inspection. */
    displayName?: string;

    /**
     * True (default) to wrap component in a call to `React.memo()`.
     * Components that are known to be unable to make effective use of memo (e.g. container
     * components) may set this to `false`. Not typically set by application code.
     */
    memo?: boolean,

    /**
     *  True (default) to enable MobX-powered reactivity via the
     * `observer()` HOC from mobx-react. Components that are known to dereference no observable
     *  state may set this to `false`, but this is not typically done by application code.
     */
    observer?: boolean
}


/**
 * Hoist utility for defining functional components. This is the primary method for creating
 * components for use in Hoist applications. Accepts either a render function (directly) or a
 * configuration object to specify that function and additional options, as described below.
 *
 * The primary additional config option is `model`. It specifies how a backing HoistModel will be
 * provided to / created by this component and if the component should publish its model to any
 * subcomponents via context.
 *
 * By default, this utility wraps the returned component in the MobX 'observer' HOC, enabling
 * MobX-powered reactivity and auto-re-rendering of observable properties read from models and
 * any other sources of observable state.
 *
 * Forward refs {@link https://reactjs.org/docs/forwarding-refs.html} are supported by specifying a
 * render function that accepts two arguments. In that case, the second arg will be considered a
 * ref, and this utility will apply `React.forwardRef` as required.
 *
 * @param config - specification object, or a render function defining the component.
 * @returns a functional React Component for use within Hoist apps.
 *
 * @see hoistCmp - a shorthand alias to this function.
 *
 * This function also has several related functions
 *
 *   - `hoistCmp.factory`/`hoistCmp.containerFactory` - return an elementFactory for a newly defined Component.
 *           instead of the Component itself.
 *
 *   - `hoistCmp.withFactory`/`hoistCmp.withContainerFactory`  - return a 2-element list containing both the newly
 *          defined Component and an elementFactory for it.
 */
export function hoistCmp<M extends HoistModel>(config: ComponentConfig<DefaultHoistProps<M>>): FC<DefaultHoistProps<M>>;
export function hoistCmp<P extends HoistProps>(config: ComponentConfig<P>): FC<P>;
export function hoistCmp<P extends HoistProps>(config: ComponentConfig<P>): FC<P> {
    // 0) Pre-process/parse args.
    if (isFunction(config)) config = {render: config, displayName: config.name};

    const render = config.render,
        className = config.className,
        displayName = config.displayName ? config.displayName : 'HoistCmp',
        isMemo = withDefault(config.memo, true),
        isObserver = withDefault(config.observer, true),
        isForwardRef = (render.length === 2);

    // 1) Default and validate the modelSpec.
    const modelSpec = withDefault(config.model, uses('*'));
    throwIf(
        modelSpec && !(modelSpec instanceof UsesSpec) && !(modelSpec instanceof CreatesSpec),
        "The 'model' config passed to hoistComponent() is incorrectly specified: provide a spec returned by either uses() or creates()."
    );

    warnIf(
        !isMemo && isObserver,
        'Cannot create an observer component without `memo`.  Memo is built-in to MobX observable. Component will be memoized.'
    );

    // 2) Decorate with function wrappers with behaviors.
    let ret: any = render;
    if (modelSpec) {
        ret = wrapWithModel(ret,  modelSpec, displayName);
    }
    if (className) {
        ret = wrapWithClassName(ret, className);
    }

    // 2a) If we are applying model or class name, will be enhancing props, they need to be cloned
    if (modelSpec || className) {
        ret = wrapWithClonedProps(ret);
    }

    // 2b) Apply display name to wrapped function.  This is the "pre-react" functional component.
    // and React dev tools expect it to be named.
    ret.displayName = displayName;

    // 3) Wrap with HOCs.
    // Note that observer includes memo.
    if (isForwardRef)           ret = forwardRef(ret);
    if (isObserver)             ret = observer(ret);
    if (isMemo && !isObserver)  ret = memo(ret);

    // 4) Mark and return.
    ret.displayName = displayName;
    ret.isHoistComponent = true;

    return ret;
}

/**
 * Alias for {@link hoistCmp}.
 */
export const hoistComponent = hoistCmp;


/**
 * Return an element factory for a newly defined component.
 *
 * Most typically used by application, this provides a simple element factory.
 */
export function hoistCmpFactory<M extends HoistModel>(config: ComponentConfig<DefaultHoistProps<M>>): StandardElementFactory<DefaultHoistProps<M>, FC<DefaultHoistProps<M>>>;
export function hoistCmpFactory<P extends HoistProps>(config: ComponentConfig<P>): StandardElementFactory<P, FC<P>>;
export function hoistCmpFactory(config) {
    return elementFactory(hoistCmp(config));
}
hoistCmp.factory = hoistCmpFactory;

/**
 * Return an element factory for a newly defined component.
 *
 * Useful for containers (e.g. toolbars, layout boxes, etc.) that may
 * frequently contain children only, and may benefit from a leaner specification.
 */
export function hoistCmpContainerFactory<M extends HoistModel>(config: ComponentConfig<DefaultHoistProps<M>>): ContainerElementFactory<DefaultHoistProps<M>, FC<DefaultHoistProps<M>>>;
export function hoistCmpContainerFactory<P extends HoistProps>(config: ComponentConfig<P>): ContainerElementFactory<P, FC<P>>;
export function hoistCmpContainerFactory(config) {
    return containerElementFactory(hoistCmp(config));
}
hoistCmp.containerFactory = hoistCmpContainerFactory;

/**
 * Returns a 2-element list containing both the newly defined Component and an elementFactory for it.
 * Used by Hoist for exporting Component artifacts that support both JSX and elementFactory based development.
 *
 * Not typically used by applications.
 */
export function hoistCmpWithFactory<P extends HoistProps>(config: ComponentConfig<P>): [FC<P>, StandardElementFactory<P, FC<P>>] {
    const cmp = hoistCmp<P>(config);
    return [cmp, elementFactory(cmp)];
}
hoistCmp.withFactory = hoistCmpWithFactory;

/**
 * Returns a 2-element list containing both the newly defined Component and an elementFactory for it.
 * Used by Hoist for exporting Component artifacts that support both JSX and elementFactory based development.
 *
 * Useful for containers (e.g. toolbars, layout boxes, etc.) that may
 * frequently contain children only, and may benefit from a leaner specification.
 *
 * Not typically used by applications.
 */
export function hoistCmpWithContainerFactory<P extends HoistProps>(config: ComponentConfig<P>): [FC<P>, ContainerElementFactory<P, FC<P>>] {
    const cmp = hoistCmp<P>(config);
    return [cmp, containerElementFactory(cmp)];
}
hoistCmp.withContainerFactory = hoistCmpWithContainerFactory;


//------------------------------------
// Implementation -- Core Wrappers
//------------------------------------
function wrapWithClassName(render, baseName) {
    return (props, ref) => {
        props.className = classNames(baseName, props.className);
        return render(props, ref);
    };
}

function wrapWithModel(render, spec, displayName) {
    return spec.publishMode === 'none' ?
        wrapWithSimpleModel(render, spec, displayName) :
        wrapWithPublishedModel(render, spec, displayName);
}

function wrapWithClonedProps(render) {
    return (props, ref) => render({...props}, ref);
}


//----------------------------------------------------------------------------------------
// 1) Lookup/create model for this component using spec, but *NEVER* publish
// received model explicitly to children.  No need to add any ContextProviders
//-----------------------------------------------------------------------------------------
function wrapWithSimpleModel(render, spec, displayName) {
    return (props, ref) => {
        const modelLookup = useContext(ModelLookupContext),
            {model} = useResolvedModel(spec, props, modelLookup, displayName);
        return callRender(render, spec, model, modelLookup, props, ref, displayName);
    };
}

//------------------------------------------------------------------------------------
// 2) Lookup/create model for this component using spec, *AND* potentially publish
// explicitly to children, if needed.  This may require inserting a ContextProvider
//------------------------------------------------------------------------------------
function wrapWithPublishedModel(render, spec, displayName) {
    return (props, ref) => {
        const publishDefault = (spec.publishMode === 'default');  // otherwise LIMITED

        // Get the model and context
        const modelLookup = useContext(ModelLookupContext),
            {model, fromContext} = useResolvedModel(spec, props, modelLookup, displayName);


        // Create any lookup needed for model, caching it in state.
        // Avoid adding extra context if this model already in default context.
        // Fixed cache here ok due to the "immutable" model from useResolvedModel
        const createLookup = () => {
            return (
                model &&
                (!modelLookup || !fromContext || (publishDefault && modelLookup.lookupModel('*') !== model))
            ) ? new ModelLookup(model, modelLookup, spec.publishMode) : null;
        };
        const [newLookup] = useState(createLookup);

        // Render the app specified elements, either raw or wrapped in context
        const rendering = callRender(render, spec, model, newLookup ?? modelLookup, props, ref, displayName);
        return newLookup ? modelLookupContextProvider({value: newLookup, item: rendering}) : rendering;
    };
}

//-------------------------------------------------------------------------------
// Wrapped call to the app specified render method.
// Provide enhanced props, and set context needed by useLocalModel() calls within
//------------------------------------------------------------------------------
function callRender(render, spec, model, modelLookup, props, ref, displayName) {
    if (!model && !spec.optional) {
        console.error(`
            Failed to find model with selector '${formatSelector(spec.selector)}' for
            component '${displayName}'.  Ensure the proper model is available via context, or
            specify explicitly using the 'model' prop.
        `);
        return cmpErrDisplay({...getLayoutProps(props), item: 'No model found'});
    }
    const ctx = localModelContext;
    try {
        props.model = model;
        ctx.props = props;
        ctx.modelLookup = modelLookup;
        return render(props, ref);
    } finally {
        ctx.props = null;
        ctx.modelLookup = null;
    }
}

//-------------------------------------------------------------------------
// Support to resolve/create model at render-time.  Used by wrappers above.
//-------------------------------------------------------------------------
function useResolvedModel(spec, props, modelLookup, displayName) {
    // fixed cache here creates the "immutable" model behavior in hoist components
    // (Need to force full remount with 'key' prop to resolve any new model)
    const [{model, isLinked, fromContext}] = useState(() => (
        spec.createFn ? createModel(spec) : lookupModel(spec, props, modelLookup, displayName)
    ));

    useModelLinker(isLinked ? model : null, modelLookup, props);

    // wire any modelRef
    useOnMount(() => {
        const {modelRef} = props;
        if (isFunction(modelRef)) {
            modelRef(model);
        } else if (isObject(modelRef)) {
            (modelRef as any).current = model;
        }
    });

    useDebugValue(model, m => m.constructor.name + (isLinked ? ' (linked)' : ''));

    return {model, fromContext};
}

function createModel(spec) {
    let model = spec.createFn();
    if (isFunction(model)) {
        // @ts-ignore
        model = new model();
    }

    return {model, isLinked: true, fromContext: false};
}

function lookupModel(spec, props, modelLookup, displayName) {
    let {model, modelConfig} = props,
        {selector} = spec;

    // 1) props - config
    if (spec.createFromConfig) {
        if (isPlainObject(model)) {   // 1a) legacy, pre-typescript
            apiDeprecated('model', {msg: "Use 'modelConfig' instead. ", v: 'v55'});
            return {model: new selector(model), isLinked: true, fromContext: false};
        }
        if (isPlainObject(modelConfig)) {  // 1b) new location
            delete props.modelConfig;
            return {model: new selector(modelConfig), isLinked: true, fromContext: false};
        }
    }

    // 2) props - instance
    if (model) {
        if (!model.isHoistModel || !model.matchesSelector(selector, true)) {
            console.error(
                `Incorrect model passed to '${displayName}'.
                Expected: ${formatSelector(selector)}
                Received: ${model.constructor.name}`
            );
            model = null;
        }
        return {model, isLinked: false, fromContext: false};
    }

    // 3) context
    if (modelLookup && spec.fromContext) {
        const contextModel = modelLookup.lookupModel(selector);
        if (contextModel) return {model: contextModel, isLinked: false, fromContext: true};
    }

    // 4) default create
    const create = spec.createDefault;
    if (create) {
        const model = (isFunction(create) ? create() : new selector());
        return {model, isLinked: true, fromContext: false};
    }

    return {model: null, isLinked: false, fromContext: false};
}

/**
 * Component to render certain errors caught within hoistComponent.
 * @internal
 */
export function setCmpErrorDisplay(ef: ElementFactory) {
    cmpErrDisplay = ef;
}

let cmpErrDisplay: ElementFactory = null;
