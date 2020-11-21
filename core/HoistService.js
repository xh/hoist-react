/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {ManagedSupport, ReactiveSupport, PersistSupport, XhIdSupport, LoadSupport} from '@xh/hoist/core';

/**
 * Core class for Services in Hoist.
 *
 * Adds support for mobx reactivity, resource management, persistence, and data loading.
 */
@ManagedSupport
@ReactiveSupport
@PersistSupport
@XhIdSupport
@LoadSupport
export class HoistService {

    get isHoistService() {return true}

    constructor() {
        this.initLoadSupport();
    }

    /**
     * Called by framework or application to initialize before application startup.
     * Throwing an exception from this method will typically block startup.
     * Service writers should take care to stifle and manage all non-fatal exceptions.
     */
    async initAsync() {}
}
HoistService.isHoistService = true;