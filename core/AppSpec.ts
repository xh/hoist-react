/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {XH, HoistAppModel, ElementFactory, HoistProps} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction, isNil, isString} from 'lodash';
import {Component, ComponentClass, FunctionComponent} from 'react';

/**
 * Specification for a client-side Hoist application.
 * Passed to XH.renderApp() to kick-off app rendering and available thereafter as `XH.appSpec`.
 */
export class AppSpec<T extends HoistAppModel = HoistAppModel> {
    /**
     *  Short code for this particular JS client application.
     *  Will default to the `appCode` specified within the project's Webpack config, but can be
     *  set to a more specific value (e.g. 'myAppMobile') to identify the client app in common
     *  code or configs.
     */
    clientAppCode?: string;

    /**
     * Display name for this particular JS client application.
     * As with `clientAppCode` above, this will default to the global `appName` specified by
     * the project's Webpack config, but can be set here to a more specific value (e.g.
     * 'MyApp Mobile').
     */
    clientAppName?: string;

    /**
     * Root Model class for the application. Note this is a reference
     * to the class itself, not an instance, and must extend {@link HoistAppModel}.
     */
    modelClass: new () => T;

    /**
     * Root HoistComponent for the application. Despite the name,
     * functional components are fully supported and expected.
     */
    componentClass: ComponentClass<HoistProps<T>> | FunctionComponent<HoistProps<T>>;

    /**
     * Container component to be used to host this application.
     * This class determines the platform used by Hoist. The value should be imported from
     * either `@xh/hoist/desktop/AppContainer` or `@xh/hoist/mobile/AppContainer`.
     */
    containerClass: ComponentClass<HoistProps> | FunctionComponent<HoistProps>;

    /** True if the app should use the Hoist mobile toolkit.*/
    isMobileApp: boolean;

    /** True to show a login form on initialization when not authenticated. (default false) */
    enableLoginForm?: boolean;

    /**
     * True to show logout options in the app.
     *
     * For apps with auth schemes that can support this operation (e.g. OAuth).  (default false)
     */
    enableLogout?: boolean;

    /**
     * Method for determining if user may access the app.
     * If a string, will be interpreted as the role required for basic UI access.
     * Otherwise, function taking a user and returning a boolean or an object of the form
     * `{hasAccess: boolean, message: 'explanatory message'}`.
     */
    checkAccess: string | ((user: object) => boolean | {hasAccess: boolean; message: string});

    /**
     *  Write a track log statement after the app has loaded and fully initialized?
     *  Message will include elapsed time of asset loading and init.
     */
    trackAppLoad?: boolean;

    /** Enable Hoist websocket connectivity? (default false) */
    webSocketsEnabled?: boolean;

    /**
     * Optional custom Component to display when App has been suspended. The component will
     * receive a single prop -- onReactivate -- a callback called when the user has acknowledged
     * the suspension and wishes to reload the app.
     */
    idlePanel?: ElementFactory | FunctionComponent | Component;

    /**
     * Optional custom Component to display when the user is denied access to app. Intended for
     * apps that implement custom auth flows. See also `lockoutMessage` for a more lightweight
     * customization option.
     */
    lockoutPanel?: ElementFactory | FunctionComponent | Component;

    /** Optional message to show on login form (see showLoginForm). */
    loginMessage?: string;

    /** Optional message to show users when denied access to app. */
    lockoutMessage?: string;

    /**
     * True to show the built-in browser context menu when no app-specific menu would be shown
     * (e.g. from a Grid). False (the default) prevents the browser menu from being shown anywhere
     * upon right-click.
     */
    showBrowserContextMenu?: boolean;

    /**
     * True to disable Field-level XSS protection by default across all Stores/Fields in the app.
     * For use with secure, internal apps that do not display arbitrary/external user input and
     * have tight performance tolerances and/or load very large recordsets.
     * @see FieldConfig.disableXssProtection
     */
    disableXssProtection?: boolean;

    constructor({
        clientAppCode = XH.appCode,
        clientAppName = XH.appName,
        modelClass,
        componentClass,
        containerClass,
        isMobileApp,
        checkAccess,
        enableLoginForm = false,
        enableLogout = false,
        trackAppLoad = true,
        webSocketsEnabled = false,
        idlePanel = null,
        lockoutPanel = null,
        loginMessage = null,
        lockoutMessage = null,
        showBrowserContextMenu = false,
        disableXssProtection = false
    }) {
        throwIf(!modelClass, 'A Hoist App must define a modelClass.');
        throwIf(!componentClass, 'A Hoist App must define a componentClass');
        throwIf(isNil(isMobileApp), 'A Hoist App must define isMobileApp');
        throwIf(
            !containerClass,
            `Please import and provide containerClass from "@xh/hoist/${
                isMobileApp ? 'mobile' : 'desktop'
            }/AppContainer".`
        );

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
        this.checkAccess = checkAccess;

        this.trackAppLoad = trackAppLoad;
        this.webSocketsEnabled = webSocketsEnabled;
        this.idlePanel = idlePanel;
        this.lockoutPanel = lockoutPanel;
        this.enableLogout = enableLogout;
        this.enableLoginForm = enableLoginForm;
        this.loginMessage = loginMessage;
        this.lockoutMessage = lockoutMessage;
        this.showBrowserContextMenu = showBrowserContextMenu;
        this.disableXssProtection = disableXssProtection;
    }
}
