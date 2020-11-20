/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {ManagedSupport, ReactiveSupport, PersistSupport, XhIdSupport} from '@xh/hoist/core';
import {makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Core class for Services in Hoist.
 *
 * Adds support for managed events, mobx reactivity, and lifecycle initialization.
 */
@ManagedSupport
@ReactiveSupport
@PersistSupport
@XhIdSupport
export class HoistService {

    @observable sniff;

    get isHoistService() {return true}

    constructor() {
        makeObservable(this);
    }

    /**
     * Called by framework or application to initialize before application startup.
     * Throwing an exception from this method will typically block startup.
     * Service writers should take care to stifle and manage all non-fatal exceptions.
     */
    async initAsync() {}
}