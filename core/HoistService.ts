/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {XH, HoistBase, managed, LoadSupport, LoadSpec, Loadable, PlainObject} from './';

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
     */
    async initAsync(): Promise<void> {}

    /**
     * Provides optional support for Hoist's approach to managed loading.
     *
     * Applications will not typically need to access this object directly. If a subclass
     * declares a concrete implementation of the `doLoadAsync()` template method, an instance of
     * `LoadSupport` will automatically be created and installed to support the extensions below.
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
    async loadAsync(loadSpec?: LoadSpec | Partial<LoadSpec>) {
        return this.loadSupport?.loadAsync(loadSpec);
    }

    //--------------
    // For override
    //--------------
    async doLoadAsync(loadSpec: LoadSpec) {}
    async onLoadException(e: unknown, loadSpec: LoadSpec) {
        if (!e['isRoutine']) {
            XH.handleException(e, {showAlert: false});
        }
    }
}

export interface HoistServiceClass<T extends HoistService = HoistService> {
    new (): T;
}
