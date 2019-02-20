/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistService} from '@xh/hoist/core';
import {Exception} from '@xh/hoist/exception';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Manage authorization using tokens.
 */
@HoistService
export class AuthService {

    ///////////////////////
    // Public access
    ///////////////////////

    async isAuthenticatedAsync() {
        return await XH
            .fetchJson({url: 'xh/authStatus'})
            .then(r => r.authenticated)
            .catch(e => {
                // 401s normal / expected for non-SSO apps when user not yet logged in.
                if (e.httpStatus == 401) return false;
                // Other exceptions indicate e.g. connectivity issue, server down - raise to user.
                throw e;
            });

    }

    async loginAsync(username, password) {

        return await XH
            .postJson({
                url: 'xh/login',
                params: {username, password},
                skipAuth: true
            })
            .thenAction(r => {
                return r.success;
            })
            .catchDefault();
    }

    /**
     * For applications that support a logout operation (i.e. not SSO), logs the current user out
     * and refreshes the application to present a login panel.
     */
    async logoutAsync() {
        return await XH
            .fetchJson({url: 'xh/logout'})
            .then(() => {
                XH.reloadApp()
            })
            .catchDefault();
    }
}
