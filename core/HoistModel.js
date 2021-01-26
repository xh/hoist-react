/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistBase} from './HoistBase';
import {managed} from './HoistBaseDecorators';
import {LoadSupport} from './LoadSupport';

/**
 * Core superclass for stateful Models in Hoist, used as backing stores for component state + APIs
 * and as general all-purpose constructs for loading, storing, processing, and observing business
 * data and other application state.
 *
 * The most common use of `HoistModel` is to support Hoist components. Components can be configured
 * to create or lookup an instance of an appropriate model subclass using the `model` config passed
 * to {@see hoistComponent} factory. Hoist will automatically pass the resolved model instance as a
 * prop to the component's `render()` function, where the model's properties can be read/rendered
 * and any imperative APIs wired to buttons, callbacks, and other handlers.
 *
 * It is very common to decorate properties on models with `@observable` and related field-level
 * annotations. This enables automatic, MobX-powered re-rendering of components when these model
 * properties change, or when specific reactions have been wired by the developer via
 * `addReaction()` and related utils from {@see HoistBase}.
 *
 * When declaring any observable properties on your model class, note that you **must** define a
 * constructor for it and call `makeObservable(this)` from within that constructor.
 *
 * When model is *created* by a HoistComponent it is considered to be 'owned' by that component,
 * meaning its existence is directly tied to the lifecycle of the component. An owned model will be
 * automatically destroyed when its component is unmounted.
 *
 * HoistModels that need to load or refresh their state from any external source (e.g. a remote
 * API or local service call) are encouraged to implement the abstract `doLoadAsync()` method
 * defined on this superclass. This will trigger the installation of a {@see LoadSupport} instance
 * on the model and enable several extensions to help track and manage async loads via the model's
 * public `loadAsync()` entry point.
 *
 * If the model is owned by a component, its `loadAsync()` be called automatically when the
 * component is first mounted and whenever triggered by the nearest {@see RefreshContextModel}
 * in the component hierarchy.
 */
export class HoistModel extends HoistBase {

    get isHoistModel() {return true}

    constructor() {
        super();
        if (this.doLoadAsync !== HoistModel.prototype.doLoadAsync) {
            this.loadSupport = new LoadSupport(this);
        }
    }

    /**
     * @member {LoadSupport} - provides optional support for Hoist's approach to managed loading.
     *
     * Applications will not typically need to access this object directly. If a model class
     * declares a concrete implementation of the `doLoadAsync()` template method, an instance of
     * `LoadSupport` will automatically be created and installed to support the extensions below.
     */
    @managed
    loadSupport;

    /** @member {PendingTaskModel} - {@see LoadSupport.loadModel} */
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
    async refreshAsync() {return this.loadSupport?.refreshAsync()}

    /** Auto-refresh this object - {@see LoadSupport.autoRefreshAsync} */
    async autoRefreshAsync() {return this.loadSupport?.autoRefreshAsync()}

    /**
     * Load this object. Implement this method to describe how this object should load
     * itself from underlying data sources or services.
     *
     * For implementation only. Callers should call `loadAsync()` or `refreshAsync()` instead.
     *
     * @param {LoadSpec} loadSpec - metadata about the underlying request. Implementations should
     *      take care to pass this parameter in calls to any delegates that support it, e.g.
     *      when calling the `loadAsync()` method of other services or child models with
     *      `loadSupport` or when making calls to the core {@see FetchService} APIs.
     */
    async doLoadAsync(loadSpec) {}
}
HoistModel.isHoistModel = true;
