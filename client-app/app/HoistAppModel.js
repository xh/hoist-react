/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist';
import {observable, setter, action} from 'hoist/mobx';
import {MultiPromiseModel, never} from 'hoist/promise';
import {ErrorDialogModel} from 'hoist/error';

/**
 * Top level model for a HoistApp.
 */
class HoistAppModel {

    useSemantic = false;

    /** Has the authentication step completed? **/
    @observable authCompleted = false;

    /** Currently authenticated user. **/
    @observable authUsername = null;

    /** Are all Hoist app services successfully initialized? */
    @setter @observable isInitialized = false;

    /** Tracks recent errors for troubleshooting/display */
    errorDialogModel = new ErrorDialogModel();

    /**
     * Tracks globally loading promises.
     *
     * Applications should bind any async operations that should mask
     * the entire application to this model.
     **/
    appLoadModel = new MultiPromiseModel();

    /**
     * Call this once when application mounted in order to
     * trigger initial authentication and initialization of application.
     */
    initApp() {
        XH.fetchJson({url: 'auth/authUser'})
            .then(r => this.markAuthenticatedUser(r.authUser.username))
            .catch(e => this.markAuthenticatedUser(null));

        this.appLoadModel.link(new Promise((res, rej) => {
            setTimeout(res, 5000);
        }));
    }

    /**
     * Trigger a full reload of the app.
     */
    @action
    reloadApp() {
        this.appLoadModel.link(never());
        window.location.reload(true);
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
        this.authCompleted = true;

        if (username && !this.isInitialized) {
            XH.initAsync()
                .then(() => this.setIsInitialized(true))
                .catchDefault();
        }
    }
}
export const hoistAppModel = new HoistAppModel();