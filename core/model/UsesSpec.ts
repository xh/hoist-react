/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, ModelSelector, ensureIsSelector, ModelPublishMode} from './';

/**
 * Returns a ModelSpec to define how a functional HoistComponent should source its primary backing
 * HoistModel from props or context. Use this option when your component expects its parent to
 * provide its model (or a config to create one).
 *
 * Hoist will look for a model instance in either props or context. If required and so specified,
 * the model can also be created on demand from either a config passed via props or its class defaults.
 *
 * The resolved/constructed model instance will be provided to the component via props and placed
 * in context for access by all subcomponents.
 *
 * Note that any model created via `createFromConfig` or `createDefault` will be considered to be
 * 'owned' by the receiving component and treated as if it were specified using `create()`: if it
 * implements loading it will be loaded on component mount, and it will always be destroyed
 * on component unmount.
 *
 * @param selector - specification of Model to use, or '*' (default) to accept the
 *      closest context model, without specifying any particular class.
 * @param opts - additional options
 */
export function uses<T extends HoistModel>(
    selector: ModelSelector<T>,
    {
        fromContext = true,
        publishMode = 'default',
        createFromConfig = true,
        createDefault = false,
        optional = false
    }: UsesOptions = {}
): UsesSpec<T> {
    return new UsesSpec(
        selector,
        fromContext,
        publishMode,
        createFromConfig,
        createDefault,
        optional
    );
}

export interface UsesOptions {
    /** True (default) to look for a suitable model in context if not sourced via props.*/
    fromContext?: boolean;

    /** Mode for publishing this model to context.*/
    publishMode?: ModelPublishMode;

    /**
     * True (default) to accept model config from props and construct an instance on-demand.
     * Selector must be a HoistModel Class.
     */
    createFromConfig?: boolean;

    /**
     * True to create a model if none provided.
     * Selector must be a HoistModel Class, or a custom function may be provided for this argument.
     */
    createDefault?: boolean | (() => HoistModel);

    /** True to specify a model that is optional.  Default false. */
    optional?: boolean;
}

export class UsesSpec<T extends HoistModel> {
    fromContext: boolean;
    publishMode: ModelPublishMode;
    optional: boolean;
    selector: ModelSelector<T>;
    createFromConfig: boolean;
    createDefault: boolean;

    constructor(selector, fromContext, publishMode, createFromConfig, createDefault, optional) {
        ensureIsSelector(selector);
        this.fromContext = fromContext;
        this.publishMode = publishMode;
        this.optional = optional;
        this.selector = selector;
        this.createFromConfig = createFromConfig;
        this.createDefault = createDefault;
    }
}
