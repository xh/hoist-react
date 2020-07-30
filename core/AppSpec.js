/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction, isNil, isString} from 'lodash';
import {apiRemoved} from '../utils/js';

/**
 * Object used to hold the specification for a client-side Hoist application.
 * Passed to XH.renderApp() to kick-off app rendering and available thereafter as `XH.appSpec`.
 */
export class AppSpec {

    /**
     * @param {Object} c - object containing app specifications.
     *
     * @param {string} [c.clientAppCode] - short code for this particular JS client application.
     *      Will default to the `appCode` specified within the project's Webpack config, but can be
     *      set to a more specific value (e.g. 'myAppMobile') to identify the client app in common
     *      code or configs.
     * @param {string} [c.clientAppName] - display name for this particular JS client application.
     *      As with `clientAppCode` above, this will default to the global `appName` specified by
     *      the project's Webpack config, but can be set here to a more specific value (e.g.
     *      'MyApp Mobile').
     * @param {boolean} c.isMobileApp - true if the app should use the Hoist mobile toolkit.
     * @param {Class} c.modelClass - root Model class for App, decorated with `@HoistAppModel`.
     * @param {Class} c.componentClass - root Component class for App, decorated with `@HoistComponent`.
     * @param {Class} c.containerClass - Container component to be used to host this application.
     *      This class determines the platform used by Hoist. The value should be imported from
     *      either `@xh/hoist/desktop/AppContainer` or `@xh/hoist/mobile/AppContainer`.
     * @param {boolean} c.isSSO - true if SSO auth is enabled, as opposed to a login prompt.
     * @param {(string|CheckAccessCb)} c.checkAccess - If a string, will be interpreted as the role
     *      required for basic UI access. Otherwise, function to determine if the passed user should
     *      be able to access the UI.
     * @param {boolean} [c.trackAppLoad] - true (default) to write a track log statement after the
     *      app has loaded and fully initialized, including elapsed time of asset loading and init.
     * @param {boolean} [c.webSocketsEnabled] - true to enable Hoist websocket connectivity,
     *      establish a connection and initiate a heartbeat..
     * @param {(Class|function)} [c.idlePanel] - Optional custom Component to display when App has
     *      been suspended.  The component will receive a single prop -- onReactivate -- a callback
     *      called when the user has acknowledged the suspension and wishes to reload the app and
     *      continue working.  Specify as a React Component or an element factory.
     * @param {?string} [c.loginMessage] - Optional message to show on login form (for non-SSO apps).
     * @param {?string} [c.lockoutMessage] - Optional message to show users when denied access to app.
     * @param {boolean} [c.showBrowserContextMenu] - True to show the default browser context menu.
     *      Default false.
     */
    constructor({
        clientAppCode = XH.appCode,
        clientAppName = XH.appName,
        modelClass,
        componentClass,
        containerClass,
        isMobileApp,
        isSSO,
        checkAccess,
        trackAppLoad = true,
        webSocketsEnabled = false,
        showBrowserContextMenu = false,
        idlePanel = null,
        loginMessage = null,
        lockoutMessage = null,
        ...rest
    }) {
        throwIf(!modelClass, 'A Hoist App must define a modelClass.');
        throwIf(!componentClass, 'A Hoist App must define a componentClass');
        throwIf(isNil(isMobileApp), 'A Hoist App must define isMobileApp');
        throwIf(
            !containerClass,
            `Please import and provide containerClass from "@xh/hoist/${isMobileApp ? 'mobile' : 'desktop'}/AppContainer".`
        );
        throwIf(isNil(isSSO), 'A Hoist App must define isSSO');
        apiRemoved(rest.idleDetectionEnabled, 'idleDetectionEnabled', 'Set "xhIdleConfig" in configuration instead.');

        throwIf(
            !isString(checkAccess) && !isFunction(checkAccess),
            'A Hoist App must specify a required role string or a function for checkAccess.'
        );

        this.clientAppCode = clientAppCode;
        this.clientAppName = clientAppName;

        this.modelClass = modelClass;
        this.componentClass = componentClass;
        this.containerClass = containerClass;
        this.isMobileApp = isMobileApp;
        this.isSSO = isSSO;
        this.checkAccess = checkAccess;
        this.trackAppLoad = trackAppLoad;

        this.webSocketsEnabled = webSocketsEnabled;
        this.idlePanel = idlePanel;
        this.loginMessage = loginMessage;
        this.lockoutMessage = lockoutMessage;
        this.showBrowserContextMenu = false;

        Object.freeze(this);
    }
}


/**
 * @callback CheckAccessCb
 * @param {Object} user
 * @returns {(boolean|Object)} - boolean indicating whether user should have access to the app,
 *      or an object of the form `{hasAccess: boolean, message: 'explanatory message'}`.
 */