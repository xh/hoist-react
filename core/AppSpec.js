/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {isNil, isString, isFunction} from 'lodash';

/**
 * Object used to hold the specification for a client-side Hoist application.
 * Passed to XH.renderApp() to kick-off app rendering and available thereafter as `XH.appSpec`.
 */
export class AppSpec {

    /**
     * @param {Object} c - object containing app specifications.
     *
     * @param {string} c.clientAppName - display name for this particular JS client application.
     *      Note this can be more specific (or not) than appName specified within the app's webpack
     *      config, which is applied to all apps built/shipped within the project as a whole.
     * @param {Class} c.modelClass - root Model class for App, decorated with `@HoistAppModel`.
     * @param {Class} c.componentClass - root Component class for App, decorated with `@HoistComponent`.
     * @param {Class} c.containerClass - Container component to be used to host this application.
     *      This class is platform specific, and should be typically either
     *      `@xh/hoist/desktop/AppContainer` or `@xh/hoist/mobile/AppContainer`.
     * @param {boolean} c.isMobile - true if the app is designed to be run on mobile devices.
     * @param {boolean} c.isSSO - true if SSO auth is enabled, as opposed to a login prompt.
     * @param {(string|CheckAccessCb)} c.checkAccess - If a string, will be interpreted as the role
     *      required for basic UI access. Otherwise, function to determine if the passed user should
     *      be able to access the UI.
     * @param {boolean} [c.trackAppLoad] - true (default) to write a track log statement after the
     *      app has loaded and fully initialized, including elapsed time of asset loading and init.
     * @param {boolean} [c.idleDetectionEnabled] - true to enable auto-suspension by `IdleService`.
     * @param {Class} [c.idleDialogClass] - Component class used to indicate App has been suspended.
     *      The component will receive a single prop -- onReactivate -- a callback called when user
     *      has acknowledged the suspension and wishes to reload the app and continue working.
     * @param {string} [c.loginMessage] - Optional message to show on login form (for non-SSO apps).
     * @param {string} [c.lockoutMessage] - Optional message to show users when denied access to app.
     */
    constructor({
        clientAppName,
        componentClass,
        modelClass,
        containerClass,
        isMobile,
        isSSO,
        checkAccess,
        trackAppLoad = true,
        idleDetectionEnabled = false,
        idleDialogClass = null,
        loginMessage = null,
        lockoutMessage = null
    }) {
        throwIf(!clientAppName, 'A Hoist App must define a clientAppName.');
        throwIf(!componentClass, 'A Hoist App must define a componentClass');
        throwIf(!modelClass, 'A Hoist App must define a modelClass.');
        throwIf(!containerClass, 'A Hoist App must define a containerClass');
        throwIf(isNil(isMobile), 'A Hoist App must define isMobile');
        throwIf(isNil(isSSO), 'A Hoist App must define isSSO');

        throwIf(
            !isString(checkAccess) && !isFunction(checkAccess),
            'A Hoist App must specify a required role string or a function for checkAccess.'
        );

        throwIf(isMobile && idleDetectionEnabled, 'Idle Detection not yet implemented on Mobile.');

        this.clientAppName = clientAppName;
        this.componentClass = componentClass;
        this.modelClass = modelClass;
        this.containerClass = containerClass;
        this.isMobile = isMobile;
        this.isSSO = isSSO;
        this.checkAccess = checkAccess;
        this.trackAppLoad = trackAppLoad;

        this.idleDetectionEnabled = idleDetectionEnabled;
        this.idleDialogClass = idleDialogClass;
        this.loginMessage = loginMessage;
        this.lockoutMessage = lockoutMessage;
        Object.freeze(this);
    }
}


/**
 * @callback CheckAccessCb
 * @param {Object} user
 * @returns {(boolean|Object)} - boolean indicating whether user should have access to the app,
 *      or an object of the form `{hasAccess: boolean, message: 'explanatory message'}`.
 */