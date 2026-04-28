/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    HoistBase,
    InitContext,
    managed,
    LoadSupport,
    LoadSpec,
    LoadSpecConfig,
    Loadable,
    PlainObject,
    TaskObserver
} from './';

/**
 * Core superclass for Services in Hoist. Services are special classes used in both Hoist and
 * application code as centralized points for managing app-wide state and loading / processing
 * data from external APIs.
 *
 * Services are distinct from Models in that they are typically constructed and initialized within
 * either `XH` (for Hoist-provided services) or within the `initAsync()` method of your primary
 * `AppModel` - see {@link XH.installServicesAsync}. A single instance of each service is
 * constructed and installed as a property on the `XH` singleton.
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
 *
 * @mcpHint base class for all application services
 */
export class HoistService extends HoistBase implements Loadable {
    // Internal State
    _created = Date.now();

    static get isHoistService(): boolean {
        return true;
    }
    get isHoistService(): boolean {
        return true;
    }

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
     *
     * @param ctx - init context
     */
    async initAsync(ctx: InitContext): Promise<void> {}

    /**
     * Provides optional support for Hoist's approach to managed loading.
     *
     * Applications will not typically need to access this object directly. If a subclass
     * declares a concrete implementation of the `doLoadAsync()` template method, an instance of
     * `LoadSupport` will automatically be created and installed to support the extensions below.
     */
    @managed
    loadSupport: LoadSupport;

    /**
     * For tracking the loading of this object.
     * Note that this object will *not* track auto-refreshes.
     */
    get loadObserver(): TaskObserver {
        return this.loadSupport?.loadObserver;
    }

    /** Date when last load was initiated. */
    get lastLoadRequested() {
        return this.loadSupport?.lastLoadRequested;
    }

    /** Date when last load was completed. */
    get lastLoadCompleted() {
        return this.loadSupport?.lastLoadCompleted;
    }

    /** Any exception that occurred during last load. */
    get lastLoadException() {
        return this.loadSupport?.lastLoadException;
    }

    /**
     * Trigger a managed refresh - equivalent to `loadAsync({isRefresh: true, meta})`. The optional
     * `meta` argument is passed directly here (not wrapped in a config object) and is exposed as
     * `loadSpec.meta` in `doLoadAsync()`.
     */
    async refreshAsync(meta?: PlainObject) {
        return this.loadSupport?.refreshAsync(meta);
    }

    /**
     * Trigger a background auto-refresh - equivalent to `loadAsync({isAutoRefresh: true, meta})`.
     * Skipped if a load is already pending. The optional `meta` argument is passed directly here
     * (not wrapped in a config object) and is exposed as `loadSpec.meta` in `doLoadAsync()`.
     */
    async autoRefreshAsync(meta?: PlainObject) {
        return this.loadSupport?.autoRefreshAsync(meta);
    }

    /**
     * Template method for subclasses that want managed loading.
     *
     * Override this method to opt into Hoist's managed loading (auto-installs {@link LoadSupport}).
     * Called by the framework via {@link loadAsync}/{@link refreshAsync}/{@link autoRefreshAsync} -
     * do not call directly. The supplied {@link LoadSpec} carries `isRefresh`, `isAutoRefresh`,
     * `isStale`, and any app-specific `meta` for branching behavior. Implementations should pass
     * `loadSpec` to nested `loadAsync()` calls and to {@link FetchService} requests.
     *
     * See the lifecycle doc (`docs/lifecycle-models-and-services.md#loading-doloadasync`) for the
     * full load/refresh lifecycle.
     */
    async doLoadAsync(loadSpec: LoadSpec) {}

    /**
     * Trigger a managed load through this object's {@link doLoadAsync} template method. Use this
     * (or {@link refreshAsync}/{@link autoRefreshAsync}) - do not call `doLoadAsync` directly,
     * so that Hoist creates a fresh {@link LoadSpec} and tracks the request via {@link LoadSupport}.
     *
     * Accepts an optional config to set `isRefresh`/`isAutoRefresh` flags or app-specific `meta`.
     *
     * See the lifecycle doc (`docs/lifecycle-models-and-services.md#loading-doloadasync`) for the
     * full load/refresh lifecycle.
     */
    async loadAsync(loadSpec?: LoadSpecConfig) {
        return this.loadSupport?.loadAsync(loadSpec);
    }
}

export interface HoistServiceClass<T extends HoistService = HoistService> {
    new (): T;
}
