/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';

/**
 * Class used to hold specfication for a Client-Side Hoist Application.
 * Passed to XH.renderApp() to kick-off application rendering, and
 * available thereafter as XH.appSpec;
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
     * @param {boolean} c.isSSO - Is SSO authentication required for this application? Set to true to prevent
     *          display of the loginPanel form and instead display a lockoutPanel if the user cannot be identified.
     *
     * @param {(string[] | function)} c.checkAccess - If a list of strings, these will be interpreted as required
     *      roles, of which the user must have at least one.  Otherwise, function to determine if the passed user
     *      should be able to access the UI.
     *
     * @param {Class} [c.suspendedDialogClass] -- Component to indicate App has been suspended.
     * @param The component will receive a single prop -- onReactivate -- a callback called when user has acknowledged
     *          the suspension and wishes to reload the app and continue working.
     * @param {boolean} [c.idleDetectionDisabled] -  Disable app suspension by IdleService?
     *          @see IdleService.  App suspension is also configurable in soft config, and via user preference.
     * @param {string} [c.loginMessage] - Optional Login Message for applications using built-in form based login.
     */
    constructor({
        componentClass,
        modelClass,
        containerClass,
        suspendedDialogClass,
        isMobile,
        isSSO,
        checkAccess,
        idleDetectionDisabled = false,
        loginMessage = null
    }) {
        throwIf(!modelClass, 'A Hoist App must define a modelClass.');
        throwIf(!componentClass, 'A Hoist App must define a componentClass');
        throwIf(!containerClass, 'A Hoist App must define a containerClass');
        throwIf(isNil(isMobile), 'A Hoist App must define isMobile');
        throwIf(isNil(isSSO), 'A Hoist App must define isSSO');
        throwIf(!checkAccess, 'A Hoist App must define checkAccess');

        this.componentClass = componentClass;
        this.modelClass = modelClass;
        this.containerClass = containerClass;
        this.suspendedDialogClass = suspendedDialogClass;
        this.isMobile = isMobile;
        this.isSSO = isSSO;
        this.checkAccess = checkAccess;

        this.idleDetectionDisabled = idleDetectionDisabled;
        this.loginMessage = loginMessage;
    }
}