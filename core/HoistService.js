/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {Loadable} from './Loadable';

/**
 * Core class for Services in Hoist.
 *
 */
export class HoistService extends Loadable {

    get isHoistService() {return true}

    /**
     * Called by framework or application to initialize before application startup.
     * Throwing an exception from this method will typically block startup.
     * Service writers should take care to stifle and manage all non-fatal exceptions.
     */
    async initAsync() {}
}
HoistService.isHoistService = true;