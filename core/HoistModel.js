/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {forOwn, has} from 'lodash';
import {makeObservable} from 'mobx';
import {throwIf, warnIf} from '../utils/js';
import {HoistBase} from './HoistBase';
import {managed} from './HoistBaseDecorators';
import {ensureIsSelector} from './modelspec/uses';
import {LoadSupport} from './refresh/LoadSupport';
import {observable, action} from '@xh/hoist/mobx';

/**
 * Core superclass for stateful Models in Hoist. Models are used throughout the toolkit and
 * applications as backing stores for components and as general all-purpose constructs for
 * loading, storing, processing, and observing business data and other application state.
 *
 * The most common use of `HoistModel` is to support Hoist components. Components can be configured
 * to create or lookup an instance of an appropriate model subclass using the `model` config passed
 * to {@see hoistComponent} factory. Hoist will automatically pass the resolved model instance as a
 * prop to the component's `render()` function, where the model's properties can be read/rendered
 * and any imperative APIs wired to buttons, callbacks, and other handlers.
 *
 * Certain models are instantiated by Hoist and linked directly in a one-to-one relationship with
 * a specific component that renders them -- these models are considered "linked", and play a
 * special role in the framework.  In particular, linked models:
 *      - are specified by the `creates` directive as well as the `useLocalModel` hook.
 *      - support an observable `componentProps` property which can be used to observe the props of
 *      their associated component.
 *      - support a `lookupModel` method and a `@lookup` decorator that can be used to acquire
 *      references to "ancestors" to this model in the component hierarchy.
 *      - support `onLinked` and `afterLinked` lifecycle methods, called during the first rendering
 *      of their associated component.  Use these methods for any work requiring the availability
 *      of lookups or `componentProps`.
 *      - have `loadAsync()` called automatically when their component is first mounted, as well
 *      as register themselves for subsequent refreshes with the nearest {@see RefreshContextModel}
 *      in the component hierarchy.
 *      - are destroyed when their linked component is unmounted.
 *
 * It is very common to decorate properties on models with `@observable` and related field-level
 * annotations. This enables automatic, MobX-powered re-rendering of components when these model
 * properties change, or when specific reactions have been wired by the developer via
 * `addReaction()` and related utils from {@see HoistBase}.  When declaring any observable
 * properties on your model class, note that you **must** call `makeObservable(this)` to initialize
 * the observability of the object.
 *
 * HoistModels that need to load or refresh their state from any external source (e.g. a remote
 * API or local service call) are encouraged to implement the abstract `doLoadAsync()` method
 * defined on this superclass. This will trigger the installation of a {@see LoadSupport} instance
 * on the model and enable several extensions to help track and manage async loads via the model's
 * public `loadAsync()` entry point.
 */
export class HoistModel extends HoistBase {

    static get isHoistModel() {return true}
    get isHoistModel() {return true}

    // Internal State
    @observable
    _componentProps = {};
    _modelLookup = null;

    constructor() {
        super();
        makeObservable(this);
        if (this.doLoadAsync !== HoistModel.prototype.doLoadAsync) {
            this.loadSupport = new LoadSupport(this);
        }
    }

    //----------------
    // Load Support
    //---------------
    /**
     * @member {LoadSupport} - provides optional support for Hoist's approach to managed loading.
     *
     * Applications will not typically need to access this object directly. If a subclass
     * declares a concrete implementation of the `doLoadAsync()` template method, an instance of
     * `LoadSupport` will automatically be created and installed to support the extensions below.
     *
     * See the class-level comments above for additional details.
     */
    @managed
    loadSupport;

    /** @member {TaskObserver} - {@see LoadSupport.loadModel} */
    get loadModel() {return this.loadSupport?.loadModel}

    /** @member {Date} - {@see LoadSupport.lastLoadRequested} */
    get lastLoadRequested() {return this.loadSupport?.lastLoadRequested}

    /** @member {Date} -  {@see LoadSupport.lastLoadCompleted} */
    get lastLoadCompleted() {return this.loadSupport?.lastLoadCompleted}

    /** @member {Error} - {@see LoadSupport.lastLoadException} */
    get lastLoadException() {return this.loadSupport?.lastLoadException}

    /**
     * Primary API to trigger a data load on any models with `loadSupport`.
     * @see LoadSupport.loadAsync()
     *
     * @param {LoadSpec} [loadSpec] - optional metadata about the underlying request, commonly used
     *      within Hoist and app code to adjust related behaviors such as error handling and
     *      activity tracking.
     */
    async loadAsync(loadSpec) {return this.loadSupport?.loadAsync(loadSpec)}

    /** Refresh this object - {@see LoadSupport.refreshAsync} */
    async refreshAsync(meta) {return this.loadSupport?.refreshAsync(meta)}

    /** Auto-refresh this object - {@see LoadSupport.autoRefreshAsync} */
    async autoRefreshAsync(meta) {return this.loadSupport?.autoRefreshAsync(meta)}

    /**
     * Implement this method to load data or other state from external data sources or services.
     * @protected - callers should call `loadAsync()` or `refreshAsync()` instead.
     *
     * @param {LoadSpec} loadSpec - metadata about the underlying request. Implementations should
     *      take care to pass this parameter in calls to any delegates that support it, e.g.
     *      when calling the `loadAsync()` method of other services or child models with
     *      `loadSupport` or when making calls to the core {@see FetchService} APIs.
     */
    async doLoadAsync(loadSpec) {}

    //---------------------------
    // Linked model support
    //---------------------------
    get isLinked() {
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
    get componentProps() {
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
     * @param {ModelSelector} selector - type of model to lookup.
     * @returns {HoistModel} - model, or null if no matching model found.
     */
    lookupModel(selector) {
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
    /** @package*/
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
}

/**
 * Parameterized decorator to inject an instance of an ancestor model in the Model lookup
 * hierarchy into this object.
 *
 * The decorated property will be filled only when the Model is linked to the Component Hierarchy.
 * Accessing properties decorated with @lookup should first be done in the onLinked(),
 * or afterLinked() handlers.
 *
 * @param {ModelSelector} selector - type/specification of model to lookup.
 */
export function lookup(selector) {
    ensureIsSelector(selector);
    return function(target, property, descriptor) {
        throwIf(!target.isHoistModel, '@lookup decorator should be applied to a subclass of HoistModel');
        // Be sure to create list for *this* particular class. Clone and include inherited values.
        if (!target.hasOwnProperty('_xhInjectedParentProperties')) {
            target._xhInjectedParentProperties = {...target._xhInjectedParentProperties};
        }
        target._xhInjectedParentProperties[property] = selector;
        return descriptor;
    };
}