/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {allSettled} from '@xh/hoist/promise';
import {defaultMethods, markClass} from '@xh/hoist/utils/js';

import {EventSupport} from './mixins/EventSupport';
import {ReactiveSupport} from './mixins/ReactiveSupport';


/**
 * Core decorator for Services in Hoist.
 *
 * All services Hoist applications should typically be decorated with this function.
 * Adds support for managed events, mobx reactivity, and lifecycle initialization.
 */
export function HoistService() {

    return (C) => {
        markClass(C, 'isHoistService');

        C = EventSupport(C);
        C = ReactiveSupport(C);

        defaultMethods(C, {
            /**
             * Called by framework or application to initialize before application startup.
             * Throwing an exception from this method will typically block startup.
             * Service writers should take care to stifle and manage all non-fatal exceptions.
             */
            async initAsync() {}
        });

        return C;
    };
}


/**
 * Initialize multiple services in parallel.
 *
 * @param svcs - one or more HoistServices.
 */
export async function initServicesAsync(...svcs) {
    const promises = svcs.map(it => it.initAsync()),
        results = await allSettled(promises),
        errs = results.filter(it => it.state === 'rejected');

    if (errs.length === 1) {
        throw errs[0].reason;
    }

    if (errs.length > 1) {
        // Enhance entire result col w/class name, we care about errs only
        results.forEach((it, idx) => {
            it.name = svcs[idx].constructor.name;
        });
        const names = errs.map(it => it.name).join(', ');

        throw XH.exception({
            message: 'Failed to initialize services: ' + names,
            details: errs
        });
    }
    return svcs;
}