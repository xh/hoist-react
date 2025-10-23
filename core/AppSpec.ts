/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {ElementFactory, HoistAppModel, HoistAuthModel, HoistProps, XH} from '@xh/hoist/core';
import {apiDeprecated, throwIf} from '@xh/hoist/utils/js';
import {isFunction, isNil, isString, isUndefined} from 'lodash';
import {Component, ComponentClass, FunctionComponent} from 'react';

/**
 * Spec for a client-side Hoist application. A config matching this class's shape is provided
 * to {@link XHApi.renderApp} to kick-off app rendering and is available thereafter as `XH.appSpec`.
 */
export class AppSpec<T extends HoistAppModel = HoistAppModel> {
    /**
     * AuthModel class for the application. Note this is a reference to the class itself, not an
     * instance, and must extend {@link HoistAuthModel}. If not provided, Hoist will fallback to
     * the superclass implementation, but note that class would only be suitable for fully
     * transparent SSO based solutions such as NTLM. Common patterns such as OAuth will require an
     * extended implementation.
     */
    authModelClass?: new () => HoistAuthModel;

    /**
     * Method for determining if user may access the app. If a string, will be interpreted as the
     * role required for basic UI access. Return false to show a generated lockout message, or use
     * the object form to provide a custom message.
     */
    checkAccess: string | ((user: object) => boolean | {hasAccess: boolean; message: string});

    /**
     *  Short code for this particular JS client application.
     *
     *  Will default to the `appCode` specified within the project's Webpack config, but can be
     *  set to a more specific value (e.g. 'myAppMobile') to identify the client app in common
     *  code or configs that support distinct settings for different client apps.
     */
    clientAppCode?: string;

    /**
     * Display name for this particular JS client application.
     *
     * As with `clientAppCode` above, this will default to the global `appName` specified by
     * the project's Webpack config, but can be set here to a more specific value (e.g.
     * 'MyApp Mobile').
     */
    clientAppName?: string;

    /**
     * Root HoistComponent for the application.
     * Despite the name, functional components are fully supported and expected.
     */
    componentClass: ComponentClass<HoistProps> | FunctionComponent<HoistProps>;

    /**
     * Container component to be used to host this application.
     *
     * This class determines the platform used by Hoist - almost all apps will import and specify
     * either `@xh/hoist/desktop/AppContainer` or `@xh/hoist/mobile/AppContainer`.
     */
    containerClass: ComponentClass<HoistProps> | FunctionComponent<HoistProps>;

    /**
     * True to disable Hoist's built-in WebSocket support for this client app. Even if the app
     * itself is not using WebSockets for business data, the Hoist Admin Console's "Clients" tab and
     * related functionality benefit from having them enabled, so disable only if there is a good
     * reason to do so.
     */
    disableWebSockets?: boolean;

    /**
     * True to enable Field-level XSS protection by default across all Stores/Fields in the app.
     * Available as an extra precaution for use with apps that might display arbitrary input from
     * untrusted or external users. This feature does exact a minor performance penalty during data
     * parsing, which can be significant in aggregate for very large stores containing records with
     * many `string` fields.
     *
     * Note: this flag and its default behavior was changed as of Hoist v77 to be `false`, i.e.
     * Store-level XSS protection *disabled* by default, in keeping with Hoist's primary use-case:
     * building secured internal apps with large datasets and tight performance tolerances.
     *
     * @see FieldSpec.enableXssProtection
     */
    enableXssProtection?: boolean;

    /**
     * True to show a login form on initialization when not authenticated. Default is `false` as
     * most Hoist applications are expected to use OAuth or SSO for authn.
     */
    enableLoginForm?: boolean;

    /**
     * True to show logout options in the app, for apps with auth schemes that can support this
     * operation (e.g. OAuth). Default is `false` as most Hoist applications are expected to use
     * SSO or to run in internal environments where logout is not required / typical.
     */
    enableLogout?: boolean;

    /**
     * Optional custom Component to display when the app has been suspended. The component will
     * receive a single `onReactivate` prop, a no-arg callback fired when the user has acknowledged
     * the suspension and wishes to reload the app.
     */
    idlePanel?: ElementFactory | FunctionComponent | Component;

    /** True if the app should use the Hoist mobile toolkit.*/
    isMobileApp: boolean;

    /**
     * Optional custom Component to display when the user is denied access to app. Intended for
     * apps that implement custom auth flows. See also `lockoutMessage` for a more lightweight
     * customization option.
     */
    lockoutPanel?: ElementFactory | FunctionComponent | Component;

    /** Optional message to show users when denied access to app. */
    lockoutMessage?: string;

    /** Optional message to show on login form, if `showLoginForm: true`. */
    loginMessage?: string;

    /**
     * Root Model class for the application. Note this is a reference to the class itself, not an
     * instance, and must extend {@link HoistAppModel}.
     */
    modelClass: new () => T;

    /**
     * True to show the built-in browser context menu when no app-specific menu would be shown
     * (e.g. from a Grid). False (the default) prevents the browser menu from being shown anywhere
     * upon right-click.
     */
    showBrowserContextMenu?: boolean;

    /**
     *  True (default) to write a track log statement after the app has loaded and fully
     *  initialized, including a breakdown of elapsed time throughout the init process.
     */
    trackAppLoad?: boolean;

    /** @deprecated - use {@link AppSpec.disableWebSockets} instead. */
    webSocketsEnabled?: boolean;

    constructor({
        authModelClass = HoistAuthModel,
        checkAccess,
        clientAppCode = XH.appCode,
        clientAppName = XH.appName,
        componentClass,
        containerClass,
        disableWebSockets = false,
        enableXssProtection = false,
        enableLoginForm = false,
        enableLogout = false,
        idlePanel = null,
        isMobileApp,
        lockoutMessage = null,
        lockoutPanel = null,
        loginMessage = null,
        modelClass,
        showBrowserContextMenu = false,
        trackAppLoad = true,
        webSocketsEnabled
    }) {
        throwIf(!componentClass, 'A Hoist App must define a componentClass');

        throwIf(
            !containerClass,
            `Please import and provide containerClass from "@xh/hoist/${isMobileApp ? 'mobile' : 'desktop'}/AppContainer".`
        );

        throwIf(!modelClass, 'A Hoist App must define a modelClass.');

        throwIf(isNil(isMobileApp), 'A Hoist App must define isMobileApp');

        throwIf(
            !isString(checkAccess) && !isFunction(checkAccess),
            'A Hoist App must specify a required role string or a function for checkAccess.'
        );

        if (!isUndefined(webSocketsEnabled)) {
            let msg: string;
            if (webSocketsEnabled === false) {
                disableWebSockets = true;
                msg = `Specify disableWebSockets: true to continue actively disabling WebSockets if required.`;
            } else {
                msg = `WebSockets are now enabled by default - this property can be safely removed from your appSpec.`;
            }
            apiDeprecated('webSocketsEnabled', {msg, v: 'v78'});
        }

        this.authModelClass = authModelClass;
        this.checkAccess = checkAccess;
        this.clientAppCode = clientAppCode;
        this.clientAppName = clientAppName;
        this.componentClass = componentClass;
        this.containerClass = containerClass;
        this.disableWebSockets = disableWebSockets;
        this.enableXssProtection = enableXssProtection;
        this.enableLoginForm = enableLoginForm;
        this.enableLogout = enableLogout;
        this.idlePanel = idlePanel;
        this.isMobileApp = isMobileApp;
        this.lockoutMessage = lockoutMessage;
        this.lockoutPanel = lockoutPanel;
        this.loginMessage = loginMessage;
        this.modelClass = modelClass;
        this.showBrowserContextMenu = showBrowserContextMenu;
        this.trackAppLoad = trackAppLoad;
        this.webSocketsEnabled = !disableWebSockets;
    }
}
