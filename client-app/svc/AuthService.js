/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from 'hoist';
import {BaseService} from './BaseService';

export class AuthService extends BaseService {

    _isAuthenticated = false;
    
    async initAsync() {
        await XH.fetchJson({
            url: 'auth/loginIfNeeded',
            params: {
                username: 'admin@xh.io',
                password: 'onBQs!!En93E3Wbj'
            }
        });
        this.isAuthenticated = true;
    }
}
