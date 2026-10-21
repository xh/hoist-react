/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {
    hoistCore,
    initTestAppAsync,
    server,
    xhUrl,
    type RecordedRequest
} from '@xh/hoist/test-support';
import {http, HttpResponse} from 'msw';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * App startup for a user who lacks the role the app requires. The client must stop before it loads
 * any app data, and say why. Access is checked for the impersonated user, so an admin who
 * impersonates such a user is locked out too - and must still be able to end impersonation.
 */
describe('AppContainerModel', () => {
    let bootRequests: RecordedRequest[];

    beforeAll(async () => {
        // An admin with access, impersonating 'jdoe', who does not have the APP_USER role.
        hoistCore.roles = ['OTHER_APP_USER'];
        hoistCore.authUser = {username: 'admin', displayName: 'Admin User', active: true};
        hoistCore.authUserRoles = ['APP_USER', 'HOIST_ADMIN', 'HOIST_IMPERSONATOR'];
        await initTestAppAsync({checkAccess: 'APP_USER'}).catch(() => {});
        bootRequests = [...hoistCore.requests];
    });

    describe('initAsync', () => {
        it('denies access to a user without the required role', () => {
            expect(XH.appState).toBe('ACCESS_DENIED');
            expect(XH.appContainerModel.appStateModel.accessDeniedMessage).toContain('APP_USER');
        });

        it('stops before loading the environment, configs or prefs', () => {
            expect(bootRequests.map(it => it.path)).toEqual(['xh/authStatus']);
        });

        it('lets an impersonating admin end impersonation', async () => {
            // Fixed in 76.0.0 (#4069) - this failed, as prefs are not yet loaded when locked out.
            const reloadApp = vi.spyOn(XH, 'reloadApp').mockImplementation(() => {});
            server.use(
                http.get(xhUrl('xh/endImpersonate'), () => new HttpResponse(null, {status: 204}))
            );

            await XH.identityService.endImpersonateAsync();
            expect(reloadApp).toHaveBeenCalledOnce();
        });
    });
});
