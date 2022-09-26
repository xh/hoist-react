/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistBase} from './HoistBase';
import {managed} from './HoistBaseDecorators';
import {LoadSupport} from './refresh/LoadSupport';
import {TaskObserver} from './TaskObserver';
import {LoadSpec} from './refresh/LoadSpec';


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

    static get isHoistService(): boolean {return true}
    get isHoistService(): boolean {return true}

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
     * Provides optional support for Hoist's approach to managed loading.
     *
     * Applications will not typically need to access this object directly. If a subclass
     * declares a concrete implementation of the `doLoadAsync()` template method, an instance of
     * `LoadSupport` will automatically be created and installed to support the extensions below.
     */
    @managed
    loadSupport: LoadSupport;

    /** @see LoadSupport.loadModel */
    get loadModel(): TaskObserver {return this.loadSupport?.loadModel}

    /** @see LoadSupport.lastLoadRequested */
    get lastLoadRequested(): Date {return this.loadSupport?.lastLoadRequested}

    /** @see LoadSupport.lastLoadCompleted */
    get lastLoadCompleted(): Date {return this.loadSupport?.lastLoadCompleted}

    /** @see LoadSupport.lastLoadException */
    get lastLoadException(): any {return this.loadSupport?.lastLoadException}

    /**
     * Primary API to trigger a data load on any models with `loadSupport`.
     * @see LoadSupport.loadAsync()
     *
     * @param [loadSpec] - optional metadata about the underlying request, commonly used
     *      within Hoist and app code to adjust related behaviors such as error handling and
     *      activity tracking.
     */
    async loadAsync(loadSpec?: LoadSpec) {return this.loadSupport?.loadAsync(loadSpec)}

    /** Refresh this object - {@see LoadSupport.refreshAsync} */
    async refreshAsync(meta: object) {return this.loadSupport?.refreshAsync(meta)}

    /** Auto-refresh this object - {@see LoadSupport.autoRefreshAsync} */
    async autoRefreshAsync(meta: object) {return this.loadSupport?.autoRefreshAsync(meta)}

    /**
     * Implement this method to load data or other state from external data sources or services.
     * @protected - callers should call `loadAsync()` or `refreshAsync()` instead.
     *
     * @param loadSpec - metadata about the underlying request. Implementations should
     *      take care to pass this parameter in calls to any delegates that support it, e.g.
     *      when calling the `loadAsync()` method of other services or child models with
     *      `loadSupport` or when making calls to the core {@see FetchService} APIs.
     */
    protected async doLoadAsync(loadSpec: LoadSpec) {}
}
