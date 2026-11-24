/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * XH.installServicesAsync() creates, inits and installs app services. A rejected install must
 * have no side effects - service init loads data, starts timers and opens connections.
 */
describe('XH.installServicesAsync', () => {
    const ctx = {span: null};

    beforeAll(() => initTestAppAsync());

    it('installs a service on XH and on its class', async () => {
        class InstalledService extends HoistService {
            static instance: InstalledService;
            initCount = 0;
            override async initAsync() {
                this.initCount++;
            }
        }

        await XH.installServicesAsync(InstalledService, ctx);

        const svc = XH['installedService'];
        expect(svc).toBeInstanceOf(InstalledService);
        expect(InstalledService.instance).toBe(svc);
        expect(svc.initCount).toBe(1);
    });

    // Fixed in 91.0.0 - a second install created and inited a new instance before it threw.
    it('rejects a second install before creating an instance', async () => {
        let created = 0;
        class RepeatService extends HoistService {
            static instance: RepeatService;
            constructor() {
                super();
                created++;
            }
        }
        await XH.installServicesAsync(RepeatService, ctx);
        const installed = RepeatService.instance;

        await expect(XH.installServicesAsync(RepeatService, ctx)).rejects.toThrow(
            "property 'repeatService' already exists"
        );
        expect(created).toBe(1);
        expect(RepeatService.instance).toBe(installed);
        expect(XH['repeatService']).toBe(installed);
    });

    it('rejects an install of a service whose install is still in progress', async () => {
        let created = 0;
        class SlowService extends HoistService {
            constructor() {
                super();
                created++;
            }
            override async initAsync() {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        const first = XH.installServicesAsync(SlowService, ctx);
        await expect(XH.installServicesAsync(SlowService, ctx)).rejects.toThrow(
            "property 'slowService' already exists"
        );
        await first;
        expect(created).toBe(1);
        expect(XH['slowService']).toBeInstanceOf(SlowService);
    });

    it('rejects a batch that lists the same service twice, installing none of it', async () => {
        let created = 0;
        class OtherService extends HoistService {
            constructor() {
                super();
                created++;
            }
        }
        class TwiceService extends HoistService {}

        await expect(
            XH.installServicesAsync([OtherService, TwiceService, TwiceService], ctx)
        ).rejects.toThrow("property 'twiceService' already exists");
        expect(created).toBe(0);
        expect(XH['otherService']).toBeUndefined();
    });

    it('rejects a service whose name collides with a Hoist service', async () => {
        class ConfigService extends HoistService {}
        const installed = XH.configService;

        await expect(XH.installServicesAsync(ConfigService, ctx)).rejects.toThrow(
            "property 'configService' already exists"
        );
        expect(XH.configService).toBe(installed);
    });
});
