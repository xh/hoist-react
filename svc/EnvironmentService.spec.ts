/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PlainObject, XH} from '@xh/hoist/core';
import {EnvironmentService} from '@xh/hoist/svc';
import {hoistCore, initTestAppAsync, server, xhUrl} from '@xh/hoist/test';
import {http, HttpResponse} from 'msw';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The version checks that stop a stale client - e.g. one loaded from a browser cache - from
 * starting against a newer server, and the poll that tells a running client about a new
 * deployment. Prompted and forced updates of deployed apps rely on this poll.
 */
describe('EnvironmentService', () => {
    beforeAll(() => initTestAppAsync());

    describe('initAsync', () => {
        it('fails when the server runs a different version of the app', async () => {
            // Fixed in 83.1.0 (#4318) - the check had compared the server's version to itself.
            const svc = createService({appVersion: '1.1.0'});

            await expect(svc.initAsync({span: null})).rejects.toThrow(
                /client \(1\.0\.0\) is out of sync/
            );
        });
    });

    describe('pollServerAsync', () => {
        it('prompts the user to reload when a new version is deployed', async () => {
            const {showUpdateBanner, suspendApp} = spyOnUpdates();
            servePoll({appVersion: '1.1.0', appBuild: 'b2'});
            await XH.environmentService.pollServerAsync();

            expect(showUpdateBanner).toHaveBeenCalledWith('1.1.0', 'b2');
            expect(suspendApp).not.toHaveBeenCalled();
            expect(XH.environmentService.serverVersion).toBe('1.1.0');
        });

        it('treats a new build of the same version as an update', async () => {
            // Lets lower environments prompt for each redeployed snapshot build.
            const {showUpdateBanner} = spyOnUpdates();
            servePoll({appBuild: 'test-2'});
            await XH.environmentService.pollServerAsync();

            expect(showUpdateBanner).toHaveBeenCalledWith('1.0.0', 'test-2');
        });

        it('suspends the app when the server requires an immediate update', async () => {
            const {showUpdateBanner, suspendApp} = spyOnUpdates();
            servePoll({
                appVersion: '1.1.0',
                pollConfig: {interval: -1, onVersionChange: 'forceReload'}
            });
            await XH.environmentService.pollServerAsync();

            expect(suspendApp).toHaveBeenCalledWith(
                expect.objectContaining({reason: 'APP_UPDATE'})
            );
            expect(showUpdateBanner).not.toHaveBeenCalled();
        });
    });
});

//------------------------
// Helpers
//------------------------
/** A new service, not yet initialized, to init against an `xh/environment` with overrides. */
function createService(overrides: PlainObject): EnvironmentService {
    server.use(
        http.get(xhUrl('xh/environment'), () =>
            HttpResponse.json({...hoistCore.environment, ...overrides})
        )
    );
    const ret = new EnvironmentService();
    onTestFinished(() => ret.destroy());
    return ret;
}

/** Answer `xh/environmentPoll` as the fake does, with overrides. */
function servePoll(overrides: PlainObject) {
    const {appCode, appVersion, appBuild, instanceName, alertBanner, pollConfig} =
        hoistCore.environment;
    server.use(
        http.get(xhUrl('xh/environmentPoll'), () =>
            HttpResponse.json({
                appCode,
                appVersion,
                appBuild,
                instanceName,
                alertBanner,
                pollConfig,
                ...overrides
            })
        )
    );
}

/** Stub the two ways a client is updated, which reach the UI and the app's state. */
function spyOnUpdates() {
    return {
        showUpdateBanner: vi
            .spyOn(XH.appContainerModel, 'showUpdateBanner')
            .mockImplementation(() => {}),
        suspendApp: vi.spyOn(XH, 'suspendApp').mockImplementation(() => {})
    };
}
