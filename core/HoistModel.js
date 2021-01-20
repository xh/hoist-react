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
 * Core class for State Models in Hoist.
 *
 * A common use of HoistModel is to serve as a backing store for a HoistComponent.  Furthermore, if
 * a model is *created* by a HoistComponent it is considered to be 'owned' (or "hosted") by that
 * component.  An owned model will be automatically destroyed when its component is unmounted.
 *
 * HoistModels that need to load/refresh may implement doLoadAsync().  See LoadSupport for more
 * information.  If specified, this method will be used to load data into the model when its
 * component is first mounted.  It will also register the model with the nearest
 * RefreshContextModel for subsequent refreshes.
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
}
HoistModel.isHoistModel = true;