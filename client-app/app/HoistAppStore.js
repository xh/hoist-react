/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, when, setter, action} from 'hoist/mobx';
import {XH} from 'hoist';

class HoistAppStore {

    @observable authCompleted = false;
    @observable authUsername = null;
    @setter @observable isInitialized = false;

    initApp() {
        this.loadAuthUsername();

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
    loadAuthUsername() {
        XH.fetchJson({url: 'auth/authUser'})
            .then(r => r.authUser)
            .catch(() => null)
            .then(username => this.setAuthUsername(username));
    }

    @action
    setAuthUsername(authUsername) {
        this.authCompleted = true;
        this.authUsername = authUsername;
    }

}

export const hoistAppStore = new HoistAppStore();