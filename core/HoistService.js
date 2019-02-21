/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {applyMixin} from '@xh/hoist/utils/js';
import {EventSupport, ReactiveSupport, XhIdSupport, ManagedSupport} from './mixins';

/**
 * Core decorator for Services in Hoist.
 *
 * All services Hoist applications should typically be decorated with this function.
 * Adds support for managed events, mobx reactivity, and lifecycle initialization.
 */
export function HoistService(C) {
    return applyMixin(C, {
        name: 'HoistService',
        includes: [ManagedSupport, EventSupport, ReactiveSupport, XhIdSupport],

        defaults: {
            /**
             * Called by framework or application to initialize before application startup.
             * Throwing an exception from this method will typically block startup.
             * Service writers should take care to stifle and manage all non-fatal exceptions.
             */
            async initAsync() {}
        }
    });
}