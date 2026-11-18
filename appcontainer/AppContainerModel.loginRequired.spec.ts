/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {hoistCore, initTestAppAsync, type RecordedRequest} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * App startup for a user with no session, in an app with a login form. Boot stops to wait for the
 * user to sign in.
 */
describe('AppContainerModel', () => {
    let bootError: Error, bootRequests: RecordedRequest[];

    beforeAll(async () => {
        hoistCore.authenticated = false;
        bootError = await initTestAppAsync({enableLoginForm: true}).then(
            () => null,
            e => e
        );
        bootRequests = [...hoistCore.requests];
    });

    it('waits for the user to sign in', () => {
        expect(XH.appState).toBe('LOGIN_REQUIRED');
    });

    it('stops before loading the environment, configs or prefs', () => {
        expect(bootRequests.map(it => it.path)).toEqual(['xh/authStatus']);
    });

    it('rejects the test boot, naming the state', () => {
        expect(bootError?.message).toContain('LOGIN_REQUIRED');
    });
});
