/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistBase} from './HoistBase';
import {managed} from './HoistBaseDecorators';
import {LoadSupport} from './refresh/LoadSupport';

/**
 * Core superclass for Services in Hoist. Services are special classes used in both Hoist and
 * application code as centralized points for managing app-wide state and loading / processing
 * data from external APIs.
 *
 * Services are distinct from Models in that they are typically constructed and initialized within
 * either `XH` (for Hoist-provided services) or within the `initAsync()` method of your primary
 * `AppModel` - {@see XH.installServicesAsync()}. A single instance of each service is constructed
 * and installed as a property on the `XH` singleton.
 *
 * (E.g. an app that defines and initializes a custom `TradeEntryService` class can access and use
 * that instance as `XH.tradeEntryService`. This mirrors the pattern for singleton service
 * injection used within the Grails server.)
 *
 * Services are most commonly used as engines within an application for loading, processing, and
 * potentially caching data, although keep in mind their singleton nature when maintaining and
 * updating state within your service. (E.g. if your service caches business objects and hands them
 * out to callers, take care that those shared objects aren't modified by callers in unexpectedly
 * shared ways.)
 *
 * Services extend `HoistBase` and can therefore leverage MobX-powered observables and reactions if
 * so desired. And while components should typically source their state from backing models, they
 * can also read and react to service state and call service APIs.
 */
export class HoistService extends HoistBase {

    get isHoistService() {return true}

    constructor() {
        super();
        if (this.doLoadAsync !== HoistService.prototype.doLoadAsync) {
            this.loadSupport = new LoadSupport(this);
        }
    }

    /**
     * Called by framework or application to initialize before application startup.
     * Throwing an exception from this method will typically block startup.
     * Service writers should take care to stifle and manage all non-fatal exceptions.
     */
    async initAsync() {}

    /**
     * @member {LoadSupport} - provides optional support for Hoist's approach to managed loading.
     *
     * Applications will not typically need to access this object directly. If a subclass
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
     * Implement this method to load data or other state from external data sources or services.
     * @protected - callers should call `loadAsync()` or `refreshAsync()` instead.
     *
     * @param {LoadSpec} loadSpec - metadata about the underlying request. Implementations should
     *      take care to pass this parameter in calls to any delegates that support it, e.g.
     *      when calling the `loadAsync()` method of other services or child models with
     *      `loadSupport` or when making calls to the core {@see FetchService} APIs.
     */
    async doLoadAsync(loadSpec) {}

}
HoistService.isHoistService = true;
