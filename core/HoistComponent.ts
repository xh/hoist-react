/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {instanceManager} from '@xh/hoist/core/impl/InstanceManager';
import {
    CreatesSpec,
    UsesSpec,
    HoistProps,
    DefaultHoistProps,
    elementFactory,
    ElementFactory,
    TestSupportProps
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
import {throwIf, warnIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps, useOnMount, useOnUnmount} from '@xh/hoist/utils/react';
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
    useEffect,
    useRef,
    createElement,
    FunctionComponent,
    useDebugValue
} from 'react';

/**
 * Type representing props passed to a HoistComponent's render function.
 *
 * This type removes from its base type several props that are pulled out by the HoistComponent itself and
 * not provided to the render function.  Ref is passed as a forwarded ref as the second argument
 * to the render function.
 */

export type RenderPropsOf<P extends HoistProps> = Omit<P, 'modelConfig' | 'modelRef' | 'ref'>;

/**
 * Configuration for creating a Component.  May be specified either as a render function,
 * or an object containing a render function and associated metadata.
 */
export type ComponentConfig<P extends HoistProps> =
    | ((props: RenderPropsOf<P>, ref?: ForwardedRef<any>) => ReactNode)
    | {
          /** Render function defining the component. */
          render(props: RenderPropsOf<P>, ref?: ForwardedRef<any>): ReactNode;

          /**
           * Spec defining the model to be rendered by this component.
           * Specify as false for components that don't require a primary model. Otherwise, set to the
           * return of {@link uses} or {@link creates} - these factory functions will create a spec for
           * either externally-provided or internally-created models. Defaults to `uses('*')`.
           */
          model?: ModelSpec<P['model']> | false;

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
          memo?: boolean;

          /**
           *  True (default) to enable MobX-powered reactivity via the
           * `observer()` HOC from mobx-react. Components that are known to dereference no observable
           *  state may set this to `false`, but this is not typically done by application code.
           */
          observer?: boolean;
      };

let cmpIndex = 0; // index for anonymous component dispay names

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
 *   - `hoistCmp.factory` - return an elementFactory for a newly defined Component.
 *           instead of the Component itself.
 *
 *   - `hoistCmp.withFactory` - return a 2-element list containing both the newly
 *          defined Component and an elementFactory for it.
 */
export function hoistCmp<M extends HoistModel>(
    config: ComponentConfig<DefaultHoistProps<M>>
): FC<DefaultHoistProps<M>>;
export function hoistCmp<P extends HoistProps>(config: ComponentConfig<P>): FC<P>;
export function hoistCmp<P extends HoistProps>(config: ComponentConfig<P>): FC<P> {
    // 0) Pre-process/parse args.
    if (isFunction(config)) config = {render: config, displayName: config.name};

    // 1) Default and validate the modelSpec.
    const modelSpec = withDefault(config.model, uses('*'));
    throwIf(
        modelSpec && !(modelSpec instanceof UsesSpec) && !(modelSpec instanceof CreatesSpec),
        "The 'model' config passed to hoistComponent() is incorrectly specified: provide a spec returned by either uses() or creates()."
    );

    let render = config.render,
        cfg: Config = {
            className: config.className,
            displayName: config.displayName ? config.displayName : 'HoistCmp' + cmpIndex++,
            isMemo: withDefault(config.memo, true),
            isObserver: withDefault(config.observer, true),
            isForwardRef: render.length === 2,
            modelSpec: modelSpec ? modelSpec : null
        };

    warnIf(
        !cfg.isMemo && cfg.isObserver,
        'Cannot create an observer component without `memo`.  Memo is built-in to MobX observable. Component will be memoized.'
    );

    // 2) Wrap supplied render function with model and classname, support. Be sure to clone props.
    if (cfg.modelSpec) {
        render = wrapWithModel(render, cfg);
    }
    if (cfg.className) {
        render = wrapWithClassName(render, cfg);
    }
    if (cfg.modelSpec || cfg.className) {
        render = wrapWithClonedProps(render);
    }

    // 4) Wrap with standard react HOCs, mark, and return.
    let ret = render as any;
    ret.displayName = cfg.displayName;
    if (cfg.isForwardRef) ret = forwardRef(ret);
    if (cfg.isObserver) ret = observer(ret);
    if (cfg.isMemo && !cfg.isObserver) ret = memo(ret);

    // 4) Mark and return.
    ret.displayName = cfg.displayName;
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
export function hoistCmpFactory<M extends HoistModel>(
    config: ComponentConfig<DefaultHoistProps<M>>
): ElementFactory<DefaultHoistProps<M>>;
export function hoistCmpFactory<P extends HoistProps>(
    config: ComponentConfig<P>
): ElementFactory<P>;
export function hoistCmpFactory(config) {
    return elementFactory(hoistCmp(config));
}
hoistCmp.factory = hoistCmpFactory;

/**
 * Returns a 2-element list containing both the newly defined Component and an elementFactory for it.
 * Used by Hoist for exporting Component artifacts that support both JSX and elementFactory based development.
 *
 * Not typically used by applications.
 */
export function hoistCmpWithFactory<M extends HoistModel>(
    config: ComponentConfig<DefaultHoistProps<M>>
): [FC<DefaultHoistProps<M>>, ElementFactory<DefaultHoistProps<M>>];
export function hoistCmpWithFactory<P extends HoistProps>(
    config: ComponentConfig<P>
): [FC<P>, ElementFactory<P>];
export function hoistCmpWithFactory(config) {
    const cmp = hoistCmp(config);
    return [cmp, elementFactory(cmp)];
}
hoistCmp.withFactory = hoistCmpWithFactory;

//----------------------------
// Implementation
//----------------------------

//----------------------------------
// internal types and core wrappers
//----------------------------------
type RenderFn = (props: HoistProps & TestSupportProps, ref?: ForwardedRef<any>) => ReactNode;

interface Config {
    displayName: string;
    className: string;
    isObserver: boolean;
    isForwardRef: boolean;
    isMemo: boolean;
    modelSpec: ModelSpec;
}

interface ResolvedModel {
    model: HoistModel;
    fromContext: boolean;
    isLinked: boolean;
}

function wrapWithClassName(render: RenderFn, cfg: Config): RenderFn {
    return (props, ref) => {
        props.className = classNames(cfg.className, props.className);
        return render(props, ref);
    };
}

function wrapWithClonedProps(render: RenderFn): RenderFn {
    return (props, ref) => render({...props}, ref);
}

//------------------------------------------------------------------------------------
// Lookup/create model for this component using spec, *AND* potentially publish
// explicitly to children, if needed.  This may require inserting a ContextProvider
//------------------------------------------------------------------------------------
function wrapWithModel(render: RenderFn, cfg: Config): RenderFn {
    const spec = cfg.modelSpec,
        {publishMode} = spec,
        publishNone = publishMode === 'none',
        publishDefault = publishMode === 'default',
        HostCmp = createCmpHost(cfg);

    return (props, ref) => {
        // 1) Get the model and modelLookup context
        const modelLookup = useContext(ModelLookupContext),
            resolvedModel = useResolvedModel(props, modelLookup, cfg),
            {isLinked, model, fromContext} = resolvedModel;

        // 2) Validate
        if (!model && !spec.optional && spec instanceof UsesSpec) {
            console.error(`
                Failed to find model with selector '${formatSelector(spec.selector)}' for
                component '${cfg.displayName}'. Ensure the proper model is available via context, or
                specify explicitly using the 'model' prop.
            `);
            return cmpErrDisplay({...getLayoutProps(props), item: 'No model found'});
        }

        useDebugValue(model, m => {
            if (!m) return 'null';
            return [
                m.constructor.name,
                m.xhId,
                isLinked ? 'linked' : fromContext ? 'context' : 'props'
            ].join(' | ');
        });

        // 3) insert any new lookup context that needs to be established.  Avoid adding if default
        // model not changing; cache object to avoid triggering re-renders in context children
        const insertLookup = useRef<ModelLookup>(null);
        if (
            !publishNone &&
            model &&
            (!modelLookup ||
                !fromContext ||
                (publishDefault && modelLookup.lookupModel('*') !== model))
        ) {
            const {current} = insertLookup;
            if (current?.model != model || current?.parent != modelLookup) {
                insertLookup.current = new ModelLookup(model, modelLookup, publishMode);
            }
        } else {
            insertLookup.current = null;
        }

        // 4) Get the rendering of the component with its model context
        // 4a) Create a generic render function, that can be called immediately, or in wrapped component.
        const managedRender = () => {
            let ctx = localModelContext;
            try {
                props.model = model;
                delete props.modelRef;
                delete props.modelConfig;
                ctx.props = props;
                ctx.modelLookup = insertLookup.current ?? modelLookup;
                useOnMount(() => instanceManager.registerModelWithTestId(props.testId, model));
                useOnUnmount(() => instanceManager.unregisterModelWithTestId(props.testId));
                return render(props, ref);
            } finally {
                ctx.props = null;
                ctx.modelLookup = null;
            }
        };

        // 4b) Get the element, either running the wrapped function directly, or in a wrapped component if needed
        const ret = isLinked
            ? managedRender()
            : createElement(HostCmp, {managedRender, key: model?.xhId});

        return insertLookup.current
            ? modelLookupContextProvider({value: insertLookup.current, item: ret})
            : ret;
    };
}

//-------------------------------------------------------------------------
// Support to resolve/create model at render-time.  Used by wrappers above.
//-------------------------------------------------------------------------
function useResolvedModel(props: HoistProps, modelLookup: ModelLookup, cfg: Config): ResolvedModel {
    let ref = useRef<ResolvedModel>(null),
        resolvedModel = ref.current;

    // 1) Lookup or create the model, as appropriate.
    if (!resolvedModel) {
        resolvedModel =
            cfg.modelSpec instanceof CreatesSpec
                ? createModel(cfg.modelSpec)
                : lookupModel(props, modelLookup, cfg);

        // 1a) Cache any linked (created) model.  Only create a model once!
        if (resolvedModel.isLinked) ref.current = resolvedModel;
    }

    // 2) Other bookkeeping, following rules of hooks, before return.
    const {model, isLinked} = resolvedModel;
    useModelLinker(isLinked ? model : null, modelLookup, props);

    const {modelRef} = props;
    useEffect(() => {
        if (isFunction(modelRef)) {
            modelRef(model);
        } else if (isObject(modelRef)) {
            (modelRef as any).current = model;
        }
    }, [model, modelRef]);

    return resolvedModel;
}

function createModel(spec: CreatesSpec<HoistModel>): ResolvedModel {
    let model = spec.createFn();
    if (isFunction(model)) {
        model = new (model as any)();
    }

    return {model, isLinked: true, fromContext: false};
}

function lookupModel(props: HoistProps, modelLookup: ModelLookup, cfg: Config): ResolvedModel {
    let {model, modelConfig} = props,
        spec = cfg.modelSpec as UsesSpec<HoistModel>,
        selector = spec.selector as any;

    // 1) props - config
    if (spec.createFromConfig) {
        if (isPlainObject(modelConfig)) {
            return {model: new selector(modelConfig), isLinked: true, fromContext: false};
        }
    }

    // 2) props - instance
    if (model) {
        if (!model.isHoistModel || !model.matchesSelector(selector, true)) {
            console.error(
                `Incorrect model passed to '${cfg.displayName}'.
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
        const model = isFunction(create) ? create() : new selector();
        return {model, isLinked: true, fromContext: false};
    }

    return {model: null, isLinked: false, fromContext: false};
}

/**
 * @internal
 *
 * Create Internal wrapper component for HoistComponents with provided models.
 *
 * Used to ensure that the core of the component is remounted,
 * if the provided model changes.
 */
function createCmpHost(cfg: Config): FunctionComponent<any> {
    let ret: FunctionComponent<any> = props => props.managedRender();
    ret = cfg.isObserver ? observer(ret) : ret;
    ret.displayName = cfg.displayName + 'Host';
    return ret;
}

/**
 * Component to render certain errors caught within hoistComponent.
 * @internal
 */
export function setCmpErrorDisplay(ef: ElementFactory) {
    cmpErrDisplay = ef;
}

let cmpErrDisplay: ElementFactory = null;
