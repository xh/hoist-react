/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistService} from '@xh/hoist/core';
import {Exception} from '@xh/hoist/exception';
import {throwIf} from '@xh/hoist/utils/js';
import {SECONDS} from '@xh/hoist/utils/datetime';

/**
 * Manage authorization using tokens.
 */
@HoistService
export class AuthService {

    accessTokenPromise = null;

    accessToken = null;
    expires = 0;
    username = null;
    apparentUsername = null;
    roles = [];

    async getAccessTokenAsync() {
        if (!this.accessToken) {
            let tokenGrant = XH.localStorageService.get('tokenGrant');
            if (tokenGrant) {
                this.setLocal(tokenGrant);
                this.accessTokenPromise = (async () => {return tokenGrant.accessToken;})();
            }
        }
        if (!this.accessTokenPromise) {
            this.accessTokenPromise = this.retrieveAccessTokenAsync()
        } else {
            if (this.accessToken) {
                const currTime = (new Date()).getTime();
                if (this.expires < currTime) {
                    this.accessTokenPromise = this.retrieveAccessTokenAsync()
                }
            } else {
                this.accessTokenPromise = this.retrieveAccessTokenAsync()
            }
        }
        return this.accessTokenPromise
    }

    async retrieveAccessTokenAsync() {
        let tokenGrant = XH.localStorageService.get('tokenGrant');
        if (tokenGrant) {
            try {
                tokenGrant = await XH.fetchService.postJson({
                    url: XH.baseUrl + 'auth/refresh',
                    params: {
                        refreshToken: tokenGrant.refreshToken
                    },
                    service: 'hoist-central',
                    skipAuth: true
                });
            } catch (e) {
                tokenGrant = null;
            }
            XH.localStorageService.set('tokenGrant', tokenGrant);
            this.setLocal(tokenGrant);
        }
        if (!tokenGrant) {
            this.accessToken = null;
            this.expires = 0;
        }
        return (tokenGrant) ? tokenGrant.accessToken : null;
    }

    // called from login when there is a new grant
    saveTokenGrant(tokenGrant) {
        const svc = XH.localStorageService;
        tokenGrant.expires = (new Date()).getTime() + tokenGrant.expiresInMillis - 10 * SECONDS;
        svc.set('tokenGrant', tokenGrant);
        this.setLocal(tokenGrant);
        this.accessTokenPromise = (async () => {return tokenGrant.accessToken;})();
        return true;
    }

    // called from logout
    clearTokenGrant() {
        const svc = XH.localStorageService;
        svc.set('tokenGrant', null);
        this.setLocal(null);
        this.accessTokenPromise = (async () => {return null;})();
        return true;
    }

    setLocal(tokenGrant) {
        if (tokenGrant) {
            this.accessToken = tokenGrant.accessToken;
            this.expires = tokenGrant.expires;
            this.username = tokenGrant.username;
            this.apparentUsername = tokenGrant.apparentUsername;
            this.roles = tokenGrant.roles;
        } else {
            this.accessToken = null;
            this.expires = 0;
            this.username = null;
            this.apparentUsername = null;
            this.roles = [];
        }
    }

    async loginAsync(username, password) {
        return XH
            .postJson({
                url: 'auth/login',
                params: {username, password},
                skipAuth: true
            })
            .thenAction(r => {
                this.warning = r.accessToken ? '' : 'Login Incorrect';
                if (r.accessToken) {
                    this.saveTokenGrant(r);
                    XH.completeInitAsync();
                }
                return r.accessToken;
            })
            .catchDefault({
                hideParams: ['password']
            });
    }
    /**
     * For applications that support a logout operation (i.e. not SSO), logs the current user out
     * and refreshes the application to present a login panel.
     */
    async logoutAsync() {
        return XH
            .fetchJson({url: 'auth/logout'})
            .then(() => {
                this.clearTokenGrant();
                XH.reloadApp()
            })
            .catchDefault(() => {
                this.clearTokenGrant();
                XH.reloadApp()
            });
    }
}