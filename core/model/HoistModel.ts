/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {warnIf} from '@xh/hoist/utils/js';
import {forOwn, has, isFunction} from 'lodash';
import {DefaultHoistProps, HoistBase, LoadSpecConfig, managed, PlainObject} from '../';
import {instanceManager} from '../impl/InstanceManager';
import {Loadable, LoadSpec, LoadSupport} from '../load';
import {ModelSelector} from './';

/**
 * Core superclass for stateful Models in Hoist. Models are used throughout the toolkit and
 * applications as backing stores for components and as general all-purpose constructs for
 * loading, storing, processing, and observing business data and other application state.
 *
 * The most common use of `HoistModel` is to support Hoist components. Components can be configured
 * to create or lookup an instance of an appropriate model subclass using the `model` config passed
 * to {@link hoistComponent.factory}. Hoist will automatically pass the resolved model instance as a
 * prop to the component's `render()` function, where the model's properties can be read/rendered
 * and any imperative APIs wired to buttons, callbacks, and other handlers.
 *
 * Certain models are instantiated by Hoist and linked directly in a one-to-one relationship with
 * a specific component that renders them. These models are considered "linked", and they play a
 * special role in the framework.  In particular, linked models:
 *      - are specified by the {@link creates} directive as well as the {@link useLocalModel} hook.
 *      - support an observable {@link componentProps} property which can be used to observe the
 *      props of their associated component.
 *      - support a {@link lookupModel} method and a `@lookup` decorator that can be used to acquire
 *      references to "ancestors" to this model in the component hierarchy.
 *      - support {@link onLinked} and {@link afterLinked} lifecycle methods, called during the
 *      first rendering of their associated component. Use these methods for any work requiring the
 *      availability of lookups or `componentProps`.
 *      - have `loadAsync()` called automatically when their component is first mounted, as well
 *      as register themselves for subsequent refreshes with the nearest {@link RefreshContextModel}
 *      in the component hierarchy.
 *      - are destroyed when their linked component is unmounted.
 *
 * It is very common to decorate properties on models with `@observable` and related field-level
 * annotations. This enables automatic, MobX-powered re-rendering of components when these model
 * properties change, or when specific reactions have been wired by the developer via
 * `addReaction()` and related utils from {@link HoistBase}.
 *
 * When declaring any observable properties on your model class, note that you **must** call
 * `makeObservable(this)` within your model's constructor in order for MobX to begin tracking your
 * observables and reacting to changes.
 *
 * HoistModels that need to load or refresh their state from any external source (e.g. a remote
 * API or local service call) are encouraged to implement the abstract `doLoadAsync()` method
 * defined on this superclass. This will trigger the installation of a {@link LoadSupport} instance
 * on the model and enable several extensions to help track and manage async loads via the model's
 * public `loadAsync()` entry point.
 */
export abstract class HoistModel extends HoistBase implements Loadable {
    /** Type for constructing an instance of this model */
    declare config: unknown;

    static get isHoistModel(): boolean {
        return true;
    }
    get isHoistModel(): boolean {
        return true;
    }

    // Internal State
    @observable
    _componentProps = {};
    _modelLookup = null;
    _created = Date.now();

    constructor() {
        super();
        makeObservable(this);

        if (this.doLoadAsync !== HoistModel.prototype.doLoadAsync) {
            this.loadSupport = new LoadSupport(this);
        }

        instanceManager.registerModel(this);
    }

    //----------------
    // Load Support
    //---------------
    /**
     * Provides optional support for Hoist's approach to managed loading.
     *
     * Applications will not typically need to access this object directly. If a subclass
     * declares a concrete implementation of the `doLoadAsync()` template method, an instance of
     * `LoadSupport` will automatically be created and installed to support the extensions below.
     *
     * See the class-level comments above for additional details.
     */
    @managed
    loadSupport: LoadSupport;

    get loadModel() {
        return this.loadSupport?.loadModel;
    }
    get lastLoadRequested() {
        return this.loadSupport?.lastLoadRequested;
    }
    get lastLoadCompleted() {
        return this.loadSupport?.lastLoadCompleted;
    }
    get lastLoadException() {
        return this.loadSupport?.lastLoadException;
    }
    async refreshAsync(meta?: PlainObject) {
        return this.loadSupport?.refreshAsync(meta);
    }
    async autoRefreshAsync(meta?: PlainObject) {
        return this.loadSupport?.autoRefreshAsync(meta);
    }
    async doLoadAsync(loadSpec: LoadSpec) {}
    async loadAsync(loadSpec?: LoadSpecConfig) {
        return this.loadSupport?.loadAsync(loadSpec);
    }

    //---------------------------
    // Linked model support
    //---------------------------
    get isLinked(): boolean {
        return !!this._modelLookup;
    }

    /**
     * React props on component linked to this model.
     *
     * Only available for linked models.
     *
     * Observability is based on a shallow computation for each prop (i.e. a reference
     * change in any particular prop will trigger observers to be notified).
     */
    get componentProps(): DefaultHoistProps {
        return this._componentProps;
    }

    /**
     * Called during first render of the component linked to this model.
     *
     * Only available for linked models.
     *
     * This method will be called when this model has been fully linked to the component
     * hierarchy. Use this method for any work requiring the availability of lookup models or
     * componentProps.  Note that this method is called *during* the initial rendering of the
     * linked component.  See also `afterLinked` for a version of this method, that will be called
     * after the first render is complete.
     */
    onLinked() {}

    /**
     * Called after first render of the component linked to this model.
     *
     * Only available for linked models.
     *
     * This method is similar to `onLinked`, however it will be called after rendering has completed
     * using the native react `useEffect` hook.
     */
    afterLinked() {}

    /**
     * Lookup an ancestor model in the context hierarchy.
     *
     * Only available for linked models.
     *
     * @param selector - type of model to lookup.
     * @returns model, or null if no matching model found.
     */
    lookupModel<T extends HoistModel>(selector: ModelSelector<T>): T {
        warnIf(
            !this.isLinked,
            'Attempted to execute a lookup from a model that has not yet been linked. ' +
                'Ensure this model was created by `creates` or `useLocalModel` and that this ' +
                'call is occurring during or after the call to onLinked().'
        );
        return this._modelLookup?.lookupModel(selector) ?? null;
    }

    //------------------
    // For use by Hoist
    //------------------
    /** @internal */
    @action
    setComponentProps(newProps) {
        const props = this._componentProps;
        Object.assign(props, newProps);
        forOwn(props, (v, k) => {
            if (!has(newProps, k)) {
                delete props[k];
            }
        });
    }

    /** @internal */
    matchesSelector(selector: ModelSelector, acceptWildcard: boolean = false): boolean {
        let sel: any = selector;
        // 1) check class ref first, it's a function, but distinct from callable function below
        if (sel.isHoistModel) return this instanceof sel;

        // 2) Recurse on any function.
        if (isFunction(sel)) {
            return this.matchesSelector(sel(this), acceptWildcard);
        }

        // 3) main tests
        if (sel === true) return true;
        if (sel === '*') return acceptWildcard;
        if (sel === this.constructor.name) return true;
        if (sel?.isHoistModel) return this instanceof sel;

        return false;
    }

    override destroy() {
        super.destroy();
        instanceManager.unregisterModel(this);
    }
}

export interface HoistModelClass<T extends HoistModel> {
    new (...args: any[]): T;
}
