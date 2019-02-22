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

    username = null;
    apparentUsername = null;
    roles = [];

    /** Return true if authenticated and throws exception otherwise. */
    async isAuthenticatedAsync() {
        const {appSpec} = XH;

        if (!await this.getAccessTokenAsync()) {
            if (appSpec.authSSOEnabled) {
                return this.loginSsoAsync();
            } else {
                throwIf(!appSpec.authLoginEnabled, 'Failed SSO Login, no alternative form of login available.');
                return false;
            }
        }
        return true;
    }

    /**
     * Attempt SSO authentication and return true if authenticated and throw exception otherwise.
     * Save auth token info into local storage if authenticated.
     */
    async loginSsoAsync() {
        return XH
            .fetchJson({
                url: 'auth/sso',
                service: 'hoist-central',
                skipAuth: true
            })
            .then(tokenGrant => {
                this.saveTokenGrant(tokenGrant);
                return true;
            }).catch(e => {
                // 401s normal / expected for non-SSO apps when user not yet logged in.
                if (e.httpStatus == 401) return false;
                // Other exceptions indicate e.g. connectivity issue, server down - raise to user.
                throw e;
            });
    }

    /**
     * Attempt form based authentication and return access token if authenticated and throw exception otherwise
     * Save auth token info into local storage if authenticated.
     */
    async loginAsync(username, password) {
        return XH.fetchService
            .postJsonForm({
                url: 'auth/login',
                params: {username, password},
                service: 'hoist-central',
                skipAuth: true
            })
            .thenAction(r => {
                this.warning = r.accessToken ? '' : 'Login Incorrect';
                if (r.accessToken) {
                    this.saveTokenGrant(r);
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
        this.clearTokenGrant();
        return await XH
            .fetchJson({
                url: 'auth/logout',
                service: 'hoist-central'
            })
            .then(() => {
                XH.reloadApp()
            })
            .catchDefault(() => {
                XH.reloadApp()
            });
    }

    //---------------------
    // Implementation
    //---------------------

    accessTokenPromise = null;

    accessToken = null;
    expires = 0;


    async getAccessTokenAsync() {
        if (!this.accessToken) {
            let tokenGrant = XH.localStorageService.get('tokenGrant');
            if (tokenGrant) {
                this.setLocal(tokenGrant);
            }
        }
        if (this.accessToken) {
            const currTime = (new Date()).getTime();
            if (!this.expires || this.expires < currTime) {
                this.accessTokenPromise = this.retrieveAccessTokenAsync()
            } else if (this.accessTokenPromise == null) {
                this.accessTokenPromise = (async () => {return this.accessToken;})();
            }
        } else {
            this.accessTokenPromise = this.retrieveAccessTokenAsync()
        }
        return this.accessTokenPromise
    }

    async retrieveAccessTokenAsync() {
        let tokenGrant = XH.localStorageService.get('tokenGrant');
        if (tokenGrant) {
            let refreshToken = tokenGrant.refreshToken;
            try {
                tokenGrant = await XH.fetchService.postJson({
                    url: 'auth/refresh',
                    params: {
                        refreshToken: refreshToken
                    },
                    service: 'hoist-central',
                    skipAuth: true
                });
            } catch (e) {
                tokenGrant = null;
            }
            if (tokenGrant) {
                tokenGrant.refreshToken = refreshToken;
                this.saveTokenGrant(tokenGrant);
            }
        }
        if (!tokenGrant) {
            this.accessToken = null;
            this.expires = 0;
        }
        return (tokenGrant) ? tokenGrant.accessToken : null;
    }

    // called from login when there is a new grant
    saveTokenGrant(tokenGrant) {
        if (!tokenGrant.refreshToken) {
            console.error('TokenGrant has no refresh token!');
        }
        tokenGrant.expires = (new Date()).getTime() + tokenGrant.expiresInMillis - 10 * SECONDS;
        this.setLocal(tokenGrant);
        this.accessTokenPromise = (async () => {return tokenGrant.accessToken;})();
        return true;
    }

    // called from logout
    clearTokenGrant() {
        this.setLocal(null);
        this.accessTokenPromise = (async () => {return null;})();
        return true;
    }

    setLocal(tokenGrant) {
        XH.localStorageService.set('tokenGrant', tokenGrant);
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
}