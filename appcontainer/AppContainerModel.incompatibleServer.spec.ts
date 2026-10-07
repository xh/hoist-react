/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {EnvironmentService} from '@xh/hoist/svc';
import {hoistCore, initTestAppAsync} from '@xh/hoist/test';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * App startup against a server that runs a Hoist Core older than this client requires. The app
 * must fail to load, rather than run against server endpoints that may be missing or may answer in
 * a different shape.
 */
describe('AppContainerModel', () => {
    let envInitResult: {type: string; value: any}, bootError: Error;

    beforeAll(async () => {
        // The fake's default server boots (see AppContainerModel.spec.ts) - only this differs.
        hoistCore.environment.hoistCoreVersion = '40.0.0';
        const envInit = vi.spyOn(EnvironmentService.prototype, 'initAsync');
        bootError = await initTestAppAsync().then(
            () => null,
            e => e
        );
        [envInitResult] = envInit.mock.settledResults;
    });

    describe('initAsync', () => {
        it('fails to load against an older Hoist Core, without starting the app', () => {
            expect(XH.appState).toBe('LOAD_FAILED');
            // Fails for the version check, not some other boot problem.
            expect(envInitResult.type).toBe('rejected');
            expect(envInitResult.value.message).toMatch(/requires the server to run\s+Hoist Core/);
            expect(XH.appModel).toBeFalsy();
        });

        it('surfaces the reason through initTestAppAsync()', () => {
            // Apps debugging a failed boot in their own specs read this cause.
            expect(bootError.cause).toMatchObject({
                message: expect.stringMatching(/requires the server to run\s+Hoist Core/)
            });
        });
    });
});
