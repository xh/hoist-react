/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistBase, managed, LoadSupport, LoadSpec, Loadable, Some} from './';
import {camelCase, castArray} from 'lodash';
import {throwIf, withDebug} from '@xh/hoist/utils/js';
import {instanceManager} from '@xh/hoist/core/impl/InstanceManager';


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
export class HoistService extends HoistBase implements Loadable {

    // Internal State
    _created = Date.now();

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
    async initAsync(): Promise<void> {

    }

    /**
     * Provides optional support for Hoist's approach to managed loading.
     *
     * Applications will not typically need to access this object directly. If a subclass
     * declares a concrete implementation of the `doLoadAsync()` template method, an instance of
     * `LoadSupport` will automatically be created and installed to support the extensions below.
     */
    @managed
    loadSupport: LoadSupport;

    get loadModel()                         {return this.loadSupport?.loadModel}
    get lastLoadRequested()                 {return this.loadSupport?.lastLoadRequested}
    get lastLoadCompleted()                 {return this.loadSupport?.lastLoadCompleted}
    get lastLoadException()                 {return this.loadSupport?.lastLoadException}
    async refreshAsync(meta?: object)       {return this.loadSupport?.refreshAsync(meta)}
    async autoRefreshAsync(meta?: object)   {return this.loadSupport?.autoRefreshAsync(meta)}
    async doLoadAsync(loadSpec: LoadSpec) {}
    async loadAsync(loadSpec?: LoadSpec|Partial<LoadSpec>) {
        return this.loadSupport?.loadAsync(loadSpec);
    }
}


/**
 * Install HoistServices on a target.
 *
 * @param serviceClasses - Classes extending HoistService
 * @param target - object on which a reference to the services should be installed.
 * Applications should typically place these services on a global singleton object. For
 * import and reference throughout the app.
 *
 * This method will create, initialize, and install the services classes listed on the target.
 * All services will be initialized concurrently. To guarantee execution order of service
 * initialization, make multiple calls to this method with await.
 *
 * Applications must choose a unique name of the form xxxService to avoid naming collisions on
 * the target. If naming collisions are detected, an error will be thrown.
 *
 * @package Applications should use HoistAppModel.initServicesAsync() instead.
 */
export async function initServicesAsync(serviceClasses: Some<HoistServiceClass>, target: object) {
    serviceClasses = castArray(serviceClasses);
    const notSvc = serviceClasses.find((it: any) => !it.isHoistService);
    throwIf(notSvc, `Cannot initialize ${notSvc?.name} - does not extend HoistService`);

    const svcs = serviceClasses.map(serviceClass => new serviceClass());
    await initServicesInternalAsync(svcs);

    svcs.forEach(svc => {
        const name = camelCase(svc.constructor.name);
        throwIf(target[name], (
            `Service cannot be installed: property '${name}' already exists on target object,
                indicating duplicate/conflicting service names or an (unsupported) attempt to
                install the same service twice.`
        ));
        target[name] = svc;
        instanceManager.registerService(svc);
    });
}

async function initServicesInternalAsync(svcs: HoistService[]) {
    const promises = svcs.map(it => {
        return withDebug(`Initializing ${it.constructor.name}`, () => {
            return it.initAsync();
        }, 'XH');
    });

    const results: any[] = await Promise.allSettled(promises),
        errs = results.filter(it => it.status === 'rejected');

    if (errs.length === 1) throw errs[0].reason;
    if (errs.length > 1) {
        // Enhance entire result col w/class name, we care about errs only
        results.forEach((it, idx) => {
            it.name = svcs[idx].constructor.name;
        });

        throw this.exception({
            message: [
                'Failed to initialize services: ',
                ...errs.map(it => it.reason.message + ' (' + it.name + ')')
            ],
            details: errs,
            isRoutine: errs.every(it => it.reason.isRoutine)
        });
    }
}

export interface HoistServiceClass {
    new(): HoistService;
}