/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {CreatesSpec, UsesSpec, elemFactory, ElemFactory, HoistProps} from './';
import {
    useModelLinker,
    localModelContext,
    ModelLookup,
    ModelLookupContext,
    modelLookupContextProvider,
    ModelPublishMode,
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
    FunctionComponent,
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
 * This function also has two convenience "sub-functions" that are properties of it:
 *   - `hoistComponent.factory` - returns an elemFactory for the newly defined Component,
 *           instead of the Component itself.
 *   - `hoistComponent.withFactory` - returns a 2-element list containing both the newly defined
 *          Component and an elemFactory for it.
 */
export function hoistComponent<M extends HoistModel>(config: ComponentConfig<HoistProps<M>>): FunctionComponent<HoistProps<M>>;
export function hoistComponent<P extends HoistProps>(config: ComponentConfig<P>): FunctionComponent<P>;

export function hoistComponent(config: ComponentConfig<HoistProps>): FunctionComponent {
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
 * A (satisfyingly short) alias for {@link hoistComponent}.
 */
export const hoistCmp = hoistComponent;

export function hoistComponentFactory<M extends HoistModel>(config: ComponentConfig<HoistProps<M>>): ElemFactory<HoistProps<M>, FunctionComponent<HoistProps<M>>>;
export function hoistComponentFactory<P extends HoistProps>(config: ComponentConfig<P>): ElemFactory<P, FunctionComponent<P>>;

export function hoistComponentFactory(config: ComponentConfig<HoistProps>): ElemFactory {
    return elemFactory(hoistComponent(config));
}

export function hoistComponentWithFactory<M extends HoistModel>(config: ComponentConfig<HoistProps<M>>): [FunctionComponent<HoistProps<M>>, ElemFactory<HoistProps<M>>];
export function hoistComponentWithFactory<P extends HoistProps>(config: ComponentConfig<P>):[FunctionComponent<P>, ElemFactory<P, FunctionComponent<P>>];

export function hoistComponentWithFactory(config: ComponentConfig<HoistProps>): [FunctionComponent, ElemFactory] {
    const ret = hoistComponent(config);
    return [ret, elemFactory(ret)];
}

/**
 * Create a new Hoist functional component and return an element factory for it.
 *
 * This method is a shortcut for `elemFactory(hoistComponent(...))`, and is intended for use by
 * apps written using elemFactory (vs. JSX) that do not need to export any direct references to the
 * Component itself.
 *
 * @returns an elementFactory function for use within parent comp render() functions.
 */
hoistComponent.factory = hoistComponentFactory;

/**
 * Create a new Hoist functional component and return it *and* a corresponding element factory.
 *
 * @returns Array, with the Component as the first element and its elemFactory as the second.
 */
hoistComponent.withFactory = hoistComponentWithFactory;


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
    return spec.publishMode === ModelPublishMode.NONE ?
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
        const publishDefault = (spec.publishMode === ModelPublishMode.DEFAULT);  // otherwise LIMITED

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
export function setCmpErrorDisplay(ef: ElemFactory) {
    cmpErrDisplay = ef;
}

let cmpErrDisplay: ElemFactory = null;
