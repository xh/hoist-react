/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';

/**
 * Object used to hold the specfication for a Client-Side Hoist Application.
 *
 * Passed to XH.renderApp() to kick-off application rendering and available thereafter as XH.appSpec;
 */
export class AppSpec {

    /**
     * @param {Object} c - object containing app specifications.
     *
     * @param {Class} c.modelClass - root Model class for App.  Should be @HoistAppModel.
     * @param {Class} c.componentClass - root Component class for App.  Should extend Component and be @HoistComponent.
     * @param {Class} c.containerClass - Container component to be used to host this application.
     *          This class is platform specific, and should be typically either
     *          @xh/hoist/desktop/AppContainer or @xh/hoist/mobile/AppContainer.
     * @param {boolean} c.isMobile, Is the app designed to be run on mobile devices?
     * @param {boolean} c.isSSO - Is SSO authentication used for this application?
     *
     * @param {(string | CheckAccessCb)} c.checkAccess - If a string, will be interpreted as a required
     *      roles.  Otherwise, function to determine if the passed user should be able to access the UI.

     * @param {boolean} [c.idleDetectionEnabled] -  Enable automatic app suspension by IdleService? @see IdleService.
     * @param {Class} [c.idleDetectionClass] -- Component class used to indicate App has been suspended.
     *      The component will receive a single prop -- onReactivate -- a callback called when user has acknowledged
     *      the suspension and wishes to reload the app and continue working.

     * @param {string} [c.loginMessage] - Optional additional message to show with login form (for non-sso applications).
     * @param {string} [c.lockoutMessage] - Optional additional message to show users when denied access to app.
     */
    constructor({
        componentClass,
        modelClass,
        containerClass,
        isMobile,
        isSSO,
        checkAccess,
        idleDetectionEnabled = false,
        idleDialogClass = null,
        loginMessage = null,
        lockoutMessage = null
    }) {
        throwIf(!modelClass, 'A Hoist App must define a modelClass.');
        throwIf(!componentClass, 'A Hoist App must define a componentClass');
        throwIf(!containerClass, 'A Hoist App must define a containerClass');
        throwIf(isNil(isMobile), 'A Hoist App must define isMobile');
        throwIf(isNil(isSSO), 'A Hoist App must define isSSO');
        throwIf(!checkAccess, 'A Hoist App must define a required role or a function for checkAccess');

        throwIf(isMobile && idleDetectionEnabled, 'Idle Detection not yet implemented on Mobile.');

        this.componentClass = componentClass;
        this.modelClass = modelClass;
        this.containerClass = containerClass;
        this.isMobile = isMobile;
        this.isSSO = isSSO;
        this.checkAccess = checkAccess;

        this.idleDetectionEnabled = idleDetectionEnabled;
        this.idleDialogClass = idleDialogClass;
        this.loginMessage = loginMessage;
        this.lockoutMessage = lockoutMessage;
    }
}


/**
 * @callback CheckAccessCb
 * @param {Object} user
 * @returns {(boolean | Object)} - boolean indicating whether user should have access to the app or an o
 *      object of the form {hasAccess: boolean, message: 'explanatory message'}
 */