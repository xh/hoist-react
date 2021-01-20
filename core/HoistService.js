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
 * Core class for Services in Hoist.
 */
export class HoistService extends HoistBase {

    get isHoistService() {return true}

    /**
     * Called by framework or application to initialize before application startup.
     * Throwing an exception from this method will typically block startup.
     * Service writers should take care to stifle and manage all non-fatal exceptions.
     */
    async initAsync() {}

    /**
     * Support for Hoist managed loading on this object.
     *
     * Applications will not typically need to access this object directly.
     * If an implementation of doLoadAsync() been provided on this object, this
     * will automatically be installed and will provide support for loading on this object.
     */
    @managed
    loadSupport;

    /** @member {PendingTaskModel} - {@see LoadSupport.loadModel}*/
    get loadModel() {return this.loadSupport?.loadModel}

    /** @member {Date} - {@see LoadSupport.lastLoadRequested} */
    get lastLoadRequested() {return this.loadSupport?.lastLoadRequested}

    /** @member {Date} -  {@see LoadSupport.lastLoadCompleted} */
    get lastLoadCompleted() {return this.loadSupport?.lastLoadCompleted}

    /** @member {Error} - {@see LoadSupport.lastLoadException} */
    get lastLoadException() {return this.loadSupport?.lastLoadException}

    /** Refresh this object - {@see LoadSupport.refreshAsync} */
    async refreshAsync() {return this.loadSupport?.refreshAsync()}

    /** Auto-refresh this object - {@see LoadSupport.autoRefreshAsync} */
    async autoRefreshAsync() {return this.loadSupport?.autoRefreshAsync()}

    /** Load this object - {@see LoadSupport.loadAsync} */
    async loadAsync(loadSpec) {return this.loadSupport?.loadAsync(loadSpec)}

    /**
     * Load this object. Implement this method to describe how this object should load
     * itself from underlying data sources or services.
     *
     * For implementation only.  Callers should call loadAsync() or refreshAsync() instead.
     *
     * @param {LoadSpec} loadSpec - Metadata about the underlying request. Implementations should
     *      take care to pass this parameter to any delegates that also support loading.
     */
    async doLoadAsync(loadSpec) {}

    constructor() {
        super();
        if (this.doLoadAsync !== HoistService.prototype.doLoadAsync) {
            this.loadSupport = new LoadSupport(this);
        }
    }
}
HoistService.isHoistService = true;