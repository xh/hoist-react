/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {hoistCore, initTestAppAsync, prefEntry, type RecordedRequest} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * App startup, run headless against the fake hoist-core: the calls a booting client makes and the
 * state it is left in. Every Hoist app runs this sequence on page load.
 */
describe('AppContainerModel', () => {
    let bootRequests: RecordedRequest[];

    beforeAll(async () => {
        hoistCore.configs.featureFlag = true;
        hoistCore.prefs.pageSize = prefEntry('int', 50, 100);
        await initTestAppAsync();
        bootRequests = [...hoistCore.requests];
    });

    it('authenticates before making any other server call', () => {
        expect(bootRequests[0].path).toBe('xh/authStatus');
    });

    it('loads environment, configs and prefs from the server', () => {
        const paths = bootRequests.map(it => it.path);
        expect(paths).toHaveLength(4);
        expect(paths).toEqual(
            expect.arrayContaining(['xh/environment', 'xh/getConfig', 'xh/getPrefs'])
        );
    });

    it('identifies the user to user-scoped endpoints', () => {
        // hoist-core rejects user-state calls whose clientUsername differs from the session user.
        const getPrefs = bootRequests.find(it => it.path === 'xh/getPrefs');
        expect(getPrefs.method).toBe('POST');
        expect(getPrefs.form).toEqual({clientUsername: 'jdoe'});
    });

    it('runs with the identity, configs and prefs the server returned', () => {
        expect(XH.appState).toBe('RUNNING');
        expect(XH.getUsername()).toBe('jdoe');
        expect(XH.getUser().hasRole('APP_USER')).toBe(true);
        expect(XH.getConf('featureFlag')).toBe(true);
        expect(XH.getPref('pageSize')).toBe(100);
        expect(XH.getEnv('appEnvironment')).toBe('Development');
    });
});
