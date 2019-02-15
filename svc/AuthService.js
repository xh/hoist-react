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

    async loginAsync(username, password) {

        return XH
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
        return XH
            .fetchJson({url: 'xh/logout'})
            .then(() => {
                XH.reloadApp()
            })
            .catchDefault();
    }
}
