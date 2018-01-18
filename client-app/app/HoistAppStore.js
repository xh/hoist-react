/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, when, setter} from 'hoist/mobx';
import {XH} from 'hoist';

class HoistAppStore {

    @setter @observable authUsername = null;
    @setter @observable isInitialized = false;

    async initAsync() {
        this.setAuthUsername(await this.loadAuthUsernameAsync());

        when(
            () => this.authUsername,
            () => {
                XH.initAsync()
                    .then(() => this.setIsInitialized(true))
                    .catchDefault();
            }
        );
    }

    //---------------------------------
    // Implementation
    //-----------------------------------
    async loadAuthUsernameAsync() {
        return XH.fetchJson({
            url: 'auth/authUser'
        }).then(response => {
            return response.authUser;
        }).catch(() => {
            return null;
        });
    }
}

export const hoistAppStore = new HoistAppStore();