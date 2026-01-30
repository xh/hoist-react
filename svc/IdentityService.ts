/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistService, HoistUser, IdentityInfo, XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Provides basic information related to the authenticated user, including application roles.
 * This service loads its data from Hoist Core's server-side identity service.
 *
 * Also provides support for recognizing impersonation and distinguishing between the apparent and
 * actual underlying user.
 */
export class IdentityService extends HoistService {
    static instance: IdentityService;

    private identity: IdentityInfo;

    /** @returns current acting user (see authUser for notes on impersonation) */
    get user(): HoistUser {
        return this.identity?.apparentUser;
    }

    /** @returns current acting user's username. */
    get username(): string {
        return this.user?.username ?? null;
    }

    /** @returns current acting user's initials, based on displayName. */
    get userInitials(): string {
        // Handle common case of displayName being left as an email address.
        const [displayName] = this.user.displayName.split('@'),
            nameParts = displayName.split(/[\s.]+/);

        return nameParts
            .map(part => part.charAt(0).toUpperCase())
            .join('')
            .substring(0, XH.isMobileApp ? 2 : 3);
    }

    /**
     * Actual user who authenticated to the web application.
     * This will be the same as the user except when an administrator is impersonation another
     * user for troubleshooting or testing. In those cases, this getter will return the actual
     * administrator, whereas `this.user` will return the user they are impersonating.
     */
    get authUser(): HoistUser {
        return this.identity?.authUser;
    }

    get authUsername(): string {
        return this.authUser?.username ?? null;
    }

    //------------------------
    // Impersonation
    //------------------------
    /** Is an impersonation session currently active? */
    get isImpersonating(): boolean {
        return this.identity && this.authUser !== this.user;
    }

    /**
     * Can the user impersonate other users?
     *
     * See also canAuthUserImpersonate() which should be consulted before actually
     * triggering any impersonation attempts.
     */
    get canImpersonate(): boolean {
        return this.canUserImpersonate(this.user);
    }

    /**
     * Can the underlying authenticated user impersonate other users?
     *
     * Use this getter to determine if Hoist should allow the client to show impersonation
     * affordances and to trigger impersonation actions.
     */
    get canAuthUserImpersonate(): boolean {
        return this.canUserImpersonate(this.authUser);
    }

    /**
     * Begin an impersonation session to act as another user. The UI server will allow this only
     * if the actual authenticated user has the rights to do, and is attempting to impersonate
     * a known user who has permission to and has accessed the app themselves. If successful,
     * the application will reload and the admin will now be acting as the other user.
     *
     * @param username - the end-user to impersonate
     */
    async impersonateAsync(username: string) {
        throwIf(
            !this.canAuthUserImpersonate,
            'User does not have right to impersonate or impersonation is disabled.'
        );
        await XH.prefService.pushPendingAsync();
        await XH.fetchJson({
            url: 'xh/impersonate',
            params: {
                username: username
            }
        });
        XH.reloadApp();
    }

    /** Exit any active impersonation, reloading the app to resume accessing it as yourself. */
    async endImpersonateAsync() {
        try {
            await XH.prefService?.pushPendingAsync();
            await XH.fetchJson({url: 'xh/endImpersonate'});
            XH.reloadApp();
        } catch (e) {
            XH.handleException(e, {message: 'Failed to end impersonation'});
        }
    }

    /**
     * @internal -- for framework use onlu.
     */
    initIdentity(identity: IdentityInfo) {
        this.identity = identity;
    }

    //-------------------
    // Implementation
    //-------------------
    private canUserImpersonate(user: HoistUser): boolean {
        return user.hasRole(`HOIST_IMPERSONATOR`) && XH.getConf('xhEnableImpersonation');
    }
}
