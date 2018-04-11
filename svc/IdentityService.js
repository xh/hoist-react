/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {XH, hoistModel} from 'hoist/core';

/**
 * Provides basic information related to the authenticated user, including application roles.
 * This service loads its data from Hoist Core's server-side identity service.
 *
 * Also provides support for user impersonation, which allows application administrators to
 * act-as end-users for troubleshooting, support, and testing purposes.
 */
export class IdentityService extends BaseService {

    _authUser = null;
    _apparentUser = null;
    
    async initAsync() {
        const data = await XH.fetchJson({url: 'hoistImpl/getIdentity'});
        if (data.user) {
            this._apparentUser = this._authUser = this.enhanceUser(data.user);
        } else {
            this._apparentUser = this.enhanceUser(data.apparentUser);
            this._authUser = this.enhanceUser(data.authUser);
        }
    }

    /**
     * The current acting user (see authUser below for notes on impersonation). This is a JS
     * object with username, displayName, email, roles, and any other properties serialized by
     * HoistUser on the server, as well as hasRole() and hasGate() convenience functions.
     */
    get user() {
        return this._apparentUser;
    }

    /** Method form of the user getter for aliasing by the XH global. */
    getUser() {
        return this.user;
    }

    get username() {
        return this._apparentUser ? this._apparentUser.username : null;
    }

    /**
     * The actual user who authenticated to the web application. This will be the same as the user
     * except when an administrator is impersonation another user for troubleshooting or testing.
     * In those cases, this getter will return the actual administrator, whereas this.user will
     * return the user they are impersonating.
     */
    get authUser() {
        return this._authUser;
    }

    get authUsername() {
        return this._authUser ? this._authUser.username : null;
    }

    /**
     * For applications that support a logout operation (i.e. not SSO), logs the current user out
     * and refreshes the application to present a login panel.
     */
    async logoutAsync() {
        return XH
            .fetchJson({url: 'hoistImpl/logout'})
            .then(() => hoistModel.reloadApp())
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
     * Begin an impersonation session to act as another user. The UI server will allow this only
     * if the actual authenticated user has the HOIST_ADMIN role, and is attempting to impersonate
     * a known user who has permission to and has accessed the app themselves. If successful,
     * the application will reload and the admin will now be acting as the other user.
     *
     * @param {string} username - the end-user to impersonate
     */
    async impersonateAsync(username) {
        return XH.fetchJson({
            url: 'hoistImpl/impersonate',
            params: {
                username: username
            }
        }).then(() => {
            hoistModel.reloadApp();
        }).catchDefault({
            message: 'Failed to impersonate'
        });
    }

    /**
     * Exit any active impersonation, reloading the app to resume normal day-to-day life as yourself.
     */
    async endImpersonateAsync() {
        return XH.fetchJson({
            url: 'hoistImpl/endImpersonate'
        }).then(() => {
            hoistModel.reloadApp();
        }).catchDefault({
            message: 'Failed to end impersonation'
        });
    }


    //------------------------
    // Implementation
    //------------------------
    enhanceUser(user) {
        if (!user) return null;
        user.hasRole = (role) => user.roles.includes(role);
        user.isHoistAdmin = user.hasRole('HOIST_ADMIN');
        user.hasGate = (gate) => this.hasGate(gate, user);
        return user;
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
