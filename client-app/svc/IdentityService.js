/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {XH} from 'hoist';

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

    get user() {
        return this._apparentUser;
    }

    get username() {
        return this._apparentUser ? this._apparentUser.username : null;
    }

    get authUser() {
        return this._authUser;
    }

    get authUsername() {
        return this._authUser ? this._authUser.username : null;
    }


    async logoutAsync() {
        return XH
            .fetchJson({url: 'hoistImpl/logout'})
            .then(() => window.location = '/')
            .catchDefault();
    }

    //-------------------------------
    // Impersonation
    //-------------------------------
    get impersonating() {
        return this._authUser !== this._apparentUser;
    }

    async impersonateAsync(username) {
        return XH.fetchJson({
            url: 'hoistImpl/impersonate',
            params: {
                username: username
            }
        }).then(() => {
            window.location = '/';
        }).catchDefault({
            message: 'Failed to impersonate'
        });
    }

    async endImpersonateAsync() {
        return XH.fetchJson({
            url: 'hoistImpl/endImpersonate'
        }).then(() => {
            window.location = '/';
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
