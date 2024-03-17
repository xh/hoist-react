/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistService, HoistServiceClass, Some, XH} from '@xh/hoist/core';
import {instanceManager} from '@xh/hoist/core/impl/InstanceManager';
import {throwIf} from '@xh/hoist/utils/js';
import {camelCase, castArray} from 'lodash';

/**
 * Install HoistServices on XH.
 *
 * @param serviceClasses - Classes extending HoistService
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
export async function installServicesAsync(serviceClasses: Some<HoistServiceClass>) {
    serviceClasses = castArray(serviceClasses);
    const notSvc = serviceClasses.find((it: any) => !it.isHoistService);
    throwIf(notSvc, `Cannot initialize ${notSvc?.name} - does not extend HoistService`);

    const svcs = serviceClasses.map(serviceClass => new serviceClass());
    await initServicesInternalAsync(svcs);

    svcs.forEach(svc => {
        const clazz = svc.constructor,
            name = camelCase(clazz.name);
        throwIf(
            XH[name],
            `Service cannot be installed: property '${name}' already exists on target object,
                indicating duplicate/conflicting service names or an (unsupported) attempt to
                install the same service twice.`
        );
        XH[name] = svc;
        (clazz as any).instance = svc;
        instanceManager.registerService(svc);
    });
}

async function initServicesInternalAsync(svcs: HoistService[]) {
    const promises = svcs.map(it => {
        return it.withDebug(`Initializing`, () => it.initAsync());
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
