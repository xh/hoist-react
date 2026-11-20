/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistService, HoistServiceClass, InitContext, Some} from '@xh/hoist/core';
import {XH} from '@xh/hoist/core';
import {instanceManager} from '@xh/hoist/core/impl/InstanceManager';
import {createSingleton, throwIf} from '@xh/hoist/utils/js';
import {camelCase, castArray} from 'lodash';

/**
 * Install HoistServices on XH.
 *
 * @param serviceClasses - Classes extending HoistService
 * @param ctx - init context for the current phase.
 *
 * This method will create, initialize, and install the services classes listed on XH.
 * All services will be initialized concurrently. To guarantee execution order of service
 * initialization, make multiple calls to this method with await.
 *
 * The created service will also be set on the 'instance' property of its own class.
 *
 * Applications must choose a unique name of the form xxxService to avoid naming collisions on
 * the target. If naming collisions are detected, an error will be thrown.
 *
 * @internal - apps should use {@link XH.installServicesAsync} instead.
 */
export async function installServicesAsync(
    serviceClasses: Some<HoistServiceClass>,
    ctx: InitContext
) {
    serviceClasses = castArray(serviceClasses);
    const notSvc = serviceClasses.find((it: any) => !it.isHoistService);
    throwIf(notSvc, `Cannot initialize ${notSvc?.name} - does not extend HoistService`);

    // Check names before creating any instance, so a conflict throws with no side effects.
    // Names stay reserved until install ends, so a concurrent install of the same name fails too.
    const names = serviceClasses.map(c => camelCase(c.name)),
        conflictIdx = names.findIndex(
            (name, idx) => XH[name] || pendingNames.has(name) || names.indexOf(name) !== idx
        );
    throwIf(
        conflictIdx >= 0,
        `Service cannot be installed: property '${names[conflictIdx]}' already exists on target
            object, indicating duplicate/conflicting service names or an (unsupported) attempt
            to install the same service twice.`
    );

    names.forEach(name => pendingNames.add(name));
    try {
        const svcs = serviceClasses.map((c, idx) => {
            const svc = createSingleton(c);
            svc.xhName ??= names[idx];
            return svc;
        });
        await initServicesInternalAsync(svcs, ctx);

        svcs.forEach((svc, idx) => {
            XH[names[idx]] = svc;
            instanceManager.registerService(svc);
        });
    } finally {
        names.forEach(name => pendingNames.delete(name));
    }
}

/** Names of services with an install in progress. */
const pendingNames = new Set<string>();

async function initServicesInternalAsync(svcs: HoistService[], ctx: InitContext) {
    const promises = svcs.map(it => {
        return it.withDebug(`Initializing`, () => it.initAsync(ctx));
    });

    const results: any[] = await Promise.allSettled(promises),
        errs = results.filter(it => it.status === 'rejected');

    if (errs.length === 1) throw errs[0].reason;
    if (errs.length > 1) {
        // Enhance entire result col w/class name, we care about errs only
        results.forEach((it, idx) => {
            it.name = svcs[idx].constructor.name;
        });

        throw XH.exception({
            message: [
                'Failed to initialize services: ',
                ...errs.map(it => it.reason.message + ' (' + it.name + ')')
            ],
            details: errs,
            isRoutine: errs.every(it => it.reason.isRoutine)
        });
    }
}
