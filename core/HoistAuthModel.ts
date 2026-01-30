/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {deepFreeze} from '@xh/hoist/utils/js';
import {HoistModel, HoistUser, IdentityInfo, PlainObject, XH} from './';

/**
 *  Base class for managing authentication lifecycle.
 *
 *  Hoist will consult this model early in the initialization sequence, prior to full Hoist
 *  initialization. This means that several core services (identity, configs, prefs) will *not* be
 *  available, but it provides the app a hook to do early service initialization or other work to
 *  support flows such as OAuth.
 *
 *  The base implementation of this class is minimal and would be adequate only for fully
 *  transparent SSO based solutions such as NTLM. Applications wishing to provide custom
 *  authentication should spec an extended version of this class in the {@link AppSpec} passed to
 *  {@link XHApi#renderApp}.
 */
export class HoistAuthModel extends HoistModel {
    /**
     * Main Entry Point.
     *
     * This method will be called *once* by Hoist early in the app loading lifecycle to determine
     * if full app loading can proceed.
     *
     * It should return true if the user could be successfully authenticated, false if the user
     * is not authenticated, and throw in the case of technical failure. If false is returned and
     * `AppSpec.enableLoginForm` is true the framework will enter the 'LOGIN_REQUIRED' state and
     * show the user a form-based login with username and password fields to be submitted securely
     * to the server.
     *
     * The default implementation of this method simply checks the auth status on the server, which
     * may be appropriate for fully SSO based solutions. Override to consult or
     * initialize third-party client resources such as OAuth.
     *
     * @returns identity of the user authenticated with the server; null if not authenticated.
     */
    async completeAuthAsync(): Promise<IdentityInfo> {
        return this.getAuthStatusFromServerAsync();
    }

    /**
     * @returns identity of the user authenticated with the server; null if not authenticated.
     */
    async getAuthStatusFromServerAsync(): Promise<IdentityInfo> {
        try {
            const {authenticated, identity} = await XH.fetchJson({url: 'xh/authStatus'});
            return authenticated ? this.parseIdentityInfo(identity) : null;
        } catch (e) {
            if (e.httpStatus === 401) return null;
            throw e;
        }
    }

    /**
     * Process a manual login, submitted by user via form.
     * @returns identity of the user authenticated with the server; null if not yet authenticated.
     */
    async loginWithCredentialsAsync(username: string, password: string): Promise<IdentityInfo> {
        const {success, identity} = await XH.fetchJson({
            url: 'xh/login',
            params: {username, password}
        });
        return success ? this.parseIdentityInfo(identity) : null;
    }

    /**
     * Logout this user with the backend server.
     *
     * The default implementation will call the 'logout' endpoint on the Grails server, clearing
     * any server-side session state there. Override to manage any client-side or third-party state.
     */
    async logoutAsync(): Promise<void> {
        await XH.fetchJson({url: 'xh/logout'});
    }

    /**
     * Load auth-related config from the server via an /xh/ endpoint that is specifically
     * whitelisted by Hoist to allow access prior to user authentication. For use in bootstrapping
     * client-side auth solutions that require configs such as OAuth endpoint URLs and client IDs.
     * See `BaseAuthenticationService.getClientConfig()` in hoist-core.
     */
    async loadConfigAsync(): Promise<PlainObject> {
        return XH.fetchService.getJson({url: 'xh/authConfig'});
    }

    /**
     * Create a client-side HoistUser.
     *
     * Application subclasses may override this method, but should typically call the super
     * implementation.
     */
    protected createUser(rawUser: PlainObject, roles: string[]): HoistUser {
        if (!rawUser) return null;
        rawUser.roles = roles;
        rawUser.hasRole = role => rawUser.roles.includes(role);
        rawUser.isHoistAdmin = rawUser.hasRole('HOIST_ADMIN');
        rawUser.isHoistAdminReader = rawUser.hasRole('HOIST_ADMIN_READER');
        rawUser.isHoistRoleManager = rawUser.hasRole('HOIST_ROLE_MANAGER');
        rawUser.hasGate = gate => this.hasGate(gate, rawUser);
        return deepFreeze(rawUser) as HoistUser;
    }

    //------------------------
    // Implementation
    //------------------------
    private hasGate(gate, user): boolean {
        const gateUsers = XH.getConf(gate, '').trim(),
            tokens = gateUsers.split(',').map(it => it.trim()),
            groupPattern = /\[([\w-]+)\]/;

        if (gateUsers === '*' || tokens.includes(user.username)) return true;

        for (let i = 0; i < tokens.length; i++) {
            const match = groupPattern.exec(tokens[i]);
            if (match && this.hasGate(match[1], user)) return true;
        }
        return false;
    }

    private parseIdentityInfo(data: PlainObject): IdentityInfo {
        let authUser, apparentUser: HoistUser;
        if (data.user) {
            authUser = apparentUser = this.createUser(data.user, data.roles);
        } else {
            authUser = this.createUser(data.authUser, data.authUserRoles);
            apparentUser = this.createUser(data.apparentUser, data.apparentUserRoles);
        }
        return {authUser, apparentUser};
    }
}
