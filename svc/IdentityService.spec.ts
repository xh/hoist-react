/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistUser, XH} from '@xh/hoist/core';
import {IdentityService} from '@xh/hoist/svc';
import {hoistCore, initTestAppAsync, server, xhUrl, type RecordedRequest} from '@xh/hoist/test';
import {http, HttpResponse} from 'msw';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The current user, and impersonation - where an admin troubleshoots by acting as another user.
 * While impersonating, the app must act fully as the other user. Switching users must first save
 * pending user state, or it is saved under the wrong user.
 */
describe('IdentityService', () => {
    let bootRequests: RecordedRequest[];

    beforeAll(async () => {
        // An admin, impersonating the fake's default user 'jdoe'.
        hoistCore.authUser = {username: 'admin', displayName: 'Admin User', active: true};
        hoistCore.authUserRoles = ['APP_USER', 'HOIST_ADMIN', 'HOIST_IMPERSONATOR'];
        hoistCore.configs.xhEnableImpersonation = true;
        hoistCore.prefs.pageSize = {type: 'int', value: 100, defaultValue: 50, isSet: true};
        // The impersonation bar, shown while impersonating, loads the users to switch to.
        server.use(
            http.get(xhUrl('xh/impersonationTargets'), () =>
                HttpResponse.json([{username: 'bob'}, {username: 'jdoe'}])
            )
        );
        await initTestAppAsync();
        bootRequests = [...hoistCore.requests];

        // Boot saves the initial sizing mode - send it now, so tests see only their own changes.
        await XH.prefService.pushPendingAsync();
        hoistCore.clearRequests();
    });

    describe('impersonation', () => {
        it('acts as the impersonated user, with only their roles', () => {
            const svc = XH.identityService;
            expect(svc.isImpersonating).toBe(true);
            expect(svc.authUsername).toBe('admin');
            expect(XH.getUsername()).toBe('jdoe');
            expect(XH.getUser().isHoistAdmin).toBe(false);

            // hoist-core checks user-state requests against the impersonated user.
            const getPrefs = bootRequests.find(it => it.path === 'xh/getPrefs');
            expect(getPrefs.form.clientUsername).toBe('jdoe');
        });

        it('keeps the right to impersonate with the admin, not the impersonated user', () => {
            // The admin keeps the impersonation bar, to switch users or end impersonation.
            expect(XH.identityService.canAuthUserImpersonate).toBe(true);
            expect(XH.identityService.canImpersonate).toBe(false);
        });

        it('saves pending user state before switching to another user', async () => {
            // Fixed in 75.0.0 (#4063) - prefs set just before a switch were lost.
            const reloadApp = vi.spyOn(XH, 'reloadApp').mockImplementation(() => {});
            let savedFirst: string[], form: URLSearchParams;
            server.use(
                http.post(xhUrl('xh/impersonate'), async ({request}) => {
                    savedFirst = hoistCore.requests.map(it => it.path);
                    form = new URLSearchParams(await request.text());
                    return new HttpResponse(null, {status: 204});
                })
            );

            XH.setPref('pageSize', 200);
            XH.track('Viewed Orders');
            await XH.identityService.impersonateAsync('bob');

            expect(savedFirst).toEqual(expect.arrayContaining(['xh/setPrefs', 'xh/track']));
            expect(form.get('username')).toBe('bob');
            expect(reloadApp).toHaveBeenCalledOnce();
        });
    });

    describe('userInitials', () => {
        it.each([
            ['Jane Doe', 'JD'],
            // A display name left as an email address.
            ['jane.doe@example.com', 'JD'],
            ['Mary Ann Van Buren', 'MAV']
        ])('derives initials from "%s"', (displayName, initials) => {
            const svc = new IdentityService(),
                user = {displayName} as HoistUser;
            onTestFinished(() => svc.destroy());
            svc.initIdentity({authUser: user, apparentUser: user});

            expect(svc.userInitials).toBe(initials);
        });
    });
});
