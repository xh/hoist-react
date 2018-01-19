/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, setter, action} from 'hoist/mobx';
import {XH} from 'hoist';

/**
 * Main Store for Managing the loading of a HoistApp
 */
class HoistAppStore {

    /** Has the authentication step completed? **/
    @observable authCompleted = false;

    /** Currently authenticated user. **/
    @observable authUsername = null;

    /** Are all Hoist app service successfully initialized? */
    @setter @observable isInitialized = false;

    /**
     * Call this once when application mounted in order to
     * trigger initial authentication and initialization of application.
     */
    initApp() {
        XH.fetchJson({url: 'auth/authUser'})
            .then(r => this.markAuthenticatedUser(r.username))
            .catch(e => this.markAuthenticatedUser(null));
    }


    /**
     * Call to mark the authenticated user.
     *
     * @param username of verified user. Use null to indicate an
     * authentication failure and an unidentified user.
     */
    @action
    markAuthenticatedUser(username) {
        this.authUsername = username;

        if (!this.authCompleted) {
            this.authCompleted = true;
            XH.initAsync()
                .then(() => this.setIsInitialized(true))
                .catchDefault();
        }
    }
}
export const hoistAppStore = new HoistAppStore();