/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {authFailure, hoistCore, initTestAppAsync, server, xhUrl} from '@xh/hoist/test';
import {http, HttpResponse} from 'msw';
import {beforeAll, beforeEach, describe, expect, it} from 'vitest';

/**
 * How the default auth model reads the user's session from hoist-core. Every app authenticates
 * through this code at startup, and hoist-core reports identity in two shapes - with and without
 * impersonation - that must both parse into the right users with the right roles.
 */
describe('HoistAuthModel', () => {
    beforeAll(() => initTestAppAsync());

    // Tests set up the server's session state - start each from the fake's default user.
    beforeEach(() => hoistCore.reset());

    describe('getAuthStatusFromServerAsync', () => {
        it('parses a normal session as a single user with their roles', async () => {
            hoistCore.roles = ['APP_USER', 'HOIST_ADMIN_READER'];
            const {authUser, apparentUser} = await XH.authModel.getAuthStatusFromServerAsync();

            // Must be the same object - IdentityService detects impersonation by reference.
            expect(apparentUser).toBe(authUser);
            expect(apparentUser.username).toBe('jdoe');
            expect(apparentUser.hasRole('APP_USER')).toBe(true);
            expect(apparentUser.hasRole('HOIST_ADMIN')).toBe(false);
            expect(apparentUser.isHoistAdminReader).toBe(true);
            expect(apparentUser.isHoistAdmin).toBe(false);
        });

        it('parses an impersonated session as two users, each with their own roles', async () => {
            hoistCore.authUser = {username: 'admin', displayName: 'Admin User', active: true};
            hoistCore.authUserRoles = ['APP_USER', 'HOIST_ADMIN', 'HOIST_IMPERSONATOR'];
            const {authUser, apparentUser} = await XH.authModel.getAuthStatusFromServerAsync();

            expect(apparentUser.username).toBe('jdoe');
            expect(apparentUser.isHoistAdmin).toBe(false);
            expect(apparentUser.hasRole('HOIST_IMPERSONATOR')).toBe(false);

            expect(authUser.username).toBe('admin');
            expect(authUser.isHoistAdmin).toBe(true);
            expect(authUser.hasRole('HOIST_IMPERSONATOR')).toBe(true);
        });

        it('returns null when the server reports no session', async () => {
            // Lets an app with a login form ask the user to log in, rather than fail to load.
            hoistCore.authenticated = false;

            expect(await XH.authModel.getAuthStatusFromServerAsync()).toBeNull();
        });

        it('rethrows other failures, such as a rejected inactive user', async () => {
            // hoist-core rejects an inactive user with an empty 403. That must fail the app load.
            server.use(http.get(xhUrl('xh/authStatus'), () => authFailure(403)));

            await expect(XH.authModel.getAuthStatusFromServerAsync()).rejects.toMatchObject({
                httpStatus: 403
            });
        });
    });

    describe('loginWithCredentialsAsync', () => {
        it('posts the credentials in the request body, never in the url', async () => {
            // Urls are written to server and proxy access logs.
            let url: URL, form: URLSearchParams;
            server.use(
                http.post(xhUrl('xh/login'), async ({request}) => {
                    url = new URL(request.url);
                    form = new URLSearchParams(await request.text());
                    return HttpResponse.json({
                        success: true,
                        identity: {user: hoistCore.user, roles: hoistCore.roles}
                    });
                })
            );
            const identity = await XH.authModel.loginWithCredentialsAsync('jdoe', 's3cret!');

            expect(url.search).toBe('');
            expect(form.get('username')).toBe('jdoe');
            expect(form.get('password')).toBe('s3cret!');
            expect(identity.apparentUser.username).toBe('jdoe');
        });

        it('returns null when the server rejects the credentials', async () => {
            // The login form then tells the user their login was incorrect.
            server.use(
                http.post(xhUrl('xh/login'), () =>
                    HttpResponse.json({success: false, identity: null})
                )
            );

            expect(await XH.authModel.loginWithCredentialsAsync('jdoe', 'wrong')).toBeNull();
        });
    });
});
