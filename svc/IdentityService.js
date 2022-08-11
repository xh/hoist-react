/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
import {deepFreeze, throwIf} from '@xh/hoist/utils/js';

/**
 * Provides basic information related to the authenticated user, including application roles.
 * This service loads its data from Hoist Core's server-side identity service.
 *
 * Also provides support for recognizing impersonation and distinguishing between the apparent and
 * actual underlying user.
 */
export class IdentityService extends HoistService {

    _authUser;
    _apparentUser;

    async initAsync() {
        const data = await XH.fetchJson({url: 'xh/getIdentity'});
        if (data.user) {
            this._apparentUser = this._authUser = this.createUser(data.user, data.roles);
        } else {
            this._apparentUser = this.createUser(data.apparentUser, data.apparentUserRoles);
            this._authUser = this.createUser(data.authUser, data.authUserRoles);
        }
    }

    /** @return {HoistUser} - current acting user (see authUser for notes on impersonation) */
    get user() {
        return this._apparentUser;
    }

    /** @return {string} - current acting user's username. */
    get username() {
        return this.user?.username ?? null;
    }

    /** @return {HoistUser} - current acting user - method form for aliasing by XH. */
    getUser() {
        return this.user;
    }

    /** @return {string} - current acting user's username - method form for aliasing by XH. */
    getUsername() {
        return this.username;
    }

    /**
     * @return {HoistUser} - actual user who authenticated to the web application.
     *      This will be the same as the user except when an administrator is impersonation another
     *      user for troubleshooting or testing. In those cases, this getter will return the actual
     *      administrator, whereas `this.user` will return the user they are impersonating.
     */
    get authUser() {
        return this._authUser;
    }

    /** @return {string} */
    get authUsername() {
        return this.authUser?.username ?? null;
    }

    /**
     * For applications that support a logout operation (i.e. not SSO), logs the current user out
     * and refreshes the application to present a login panel.
     */
    async logoutAsync() {
        try {
            await XH.appModel.logoutAsync();
        } catch (e) {
            console.error('Error calling XH.appModel.logoutAsync()', e);
        }
        return XH
            .fetchJson({url: 'xh/logout'})
            .then(() => XH.reloadApp())
            .catchDefault();
    }

    //------------------------
    // Impersonation
    //------------------------
    /** Is an impersonation session currently active? */
    get isImpersonating() {
        return this._authUser !== this._apparentUser;
    }

    /**
     * Can the user impersonate other users?
     *
     * See also canAuthUserImpersonate() which should be consulted before actually
     * triggering any impersonation attempts.
     */
    get canImpersonate() {
        return this.user.isHoistAdmin && XH.getConf('xhEnableImpersonation', false);
    }

    /**
     * Can the underlying authenticated user impersonate other users?
     *
     * Use this getter to determine if Hoist should allow the client to show impersonation
     * affordances and to trigger impersonation actions.
     */
    get canAuthUserImpersonate() {
        return this._authUser.isHoistAdmin && XH.getConf('xhEnableImpersonation', false);
    }

    /**
     * Begin an impersonation session to act as another user. The UI server will allow this only
     * if the actual authenticated user has the HOIST_ADMIN role, and is attempting to impersonate
     * a known user who has permission to and has accessed the app themselves. If successful,
     * the application will reload and the admin will now be acting as the other user.
     *
     * @param {string} username - the end-user to impersonate
     */
    async impersonateAsync(username) {
        throwIf(
            !this.canAuthUserImpersonate,
            'User does not have right to impersonate or impersonation is disabled.'
        );
        return XH.fetchJson({
            url: 'xh/impersonate',
            params: {
                username: username
            }
        }).then(() => {
            XH.reloadApp();
        });
    }

    /** Exit any active impersonation, reloading the app to resume accessing it as yourself. */
    async endImpersonateAsync() {
        return XH.fetchJson({
            url: 'xh/endImpersonate'
        }).then(() => {
            XH.reloadApp();
        }).catchDefault({
            message: 'Failed to end impersonation'
        });
    }

    //------------------------
    // Implementation
    //------------------------
    createUser(user, roles) {
        if (!user) return null;
        user.roles = roles;
        user.hasRole = (role) => user.roles.includes(role);
        user.isHoistAdmin = user.hasRole('HOIST_ADMIN');
        user.hasGate = (gate) => this.hasGate(gate, user);
        return deepFreeze(user);
    }

    hasGate(gate, user) {
        const gateUsers =  XH.getConf(gate, '').trim(),
            tokens = gateUsers.split(',').map(it => it.trim()),
            groupPattern = /\[([\w-]+)\]/;

        if (gateUsers === '*' || tokens.includes(user.username)) return true;

        for (let i = 0; i < tokens.length; i++) {
            const match = groupPattern.exec(tokens[i]);
            if (match && this.hasGate(match[1], user)) return true;

        }
        return false;
    }

}

/**
 * @typedef {Object} HoistUser - may contain other custom properties serialized by an application.
 * @property {string} username
 * @property {string} email
 * @property {string} displayName
 * @property {string[]} roles
 * @property {boolean} isHoistAdmin
 * @property {function(string): boolean} hasRole
 * @property {function(string): boolean} hasGate
 */
