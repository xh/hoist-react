/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {webSocketIndicator} from '@xh/hoist/cmp/websocket';
import {AppOptionSpec, HoistModel, Thunkable} from './';
import {Route} from 'router5';
import {ReactNode} from 'react';
/**
 * Specialized base class for defining the central model for a Hoist app as specified by its
 * See the {@link AppSpec.modelClass} config, which should reference a concrete implementation class
 * extending this base. Hoist will create and then initialize an instance of that class after
 * the framework has successfully initialized and will make it available to all app code via the
 * `XH.appModel` getter.
 *
 * Applications should specify this class to provide application level state and services and
 * customize important metadata. Initialization of all resources (e.g. application level services)
 * should be done in `initAsync()`.
 *
 * Hoist will load/reload this Model during the global refresh process. This will occur before the
 * application's global `XH.refreshContextModel` has been refreshed (when all mounted and 'owned'
 * HoistModels in the application are refreshed). AppModels should implement `doLoadAsync()` if
 * required to refresh all other app-wide services and models, respecting any ordering and phasing
 * requirements specific to its needs.
 */
export class HoistAppModel extends HoistModel {
    /**
     * Hoist will call this method early in the initialization sequence, prior to user
     * authentication and full Hoist initialization. This means that several core services
     * (identity, configs, prefs) will *not* be available, but it provides the app a hook to
     * do early service initialization or other work to support flows such as OAuth.
     */
    static async preAuthAsync() {}

    /**
     * Hoist will call this method after Hoist services have initialized and the application
     * has mounted. Use to trigger initialization of the app and any app-specific services.
     *
     * Applications will typically use this method to install and initialize app-specific
     * services using one or more phased calls to XH.installServicesAsync().
     */
    async initAsync() {}

    /**
     * Called by {@link IdentityService.logoutAsync} to provide an app-specific hook prior
     * to logging out an authenticated user. Applicable only to apps that generally support
     * logout (i.e. not SSO) and require handling in addition to Hoist server logout.
     */
    async logoutAsync() {}

    /**
     * Should the version bar be shown in this application?.
     * Applications  for which  a version bar might not be appropriate (e.g. a mini-app
     * being shown in a frame or modal) may override this getter and return false
     */
    get supportsVersionBar(): boolean {
        return true;
    }

    /**
     * Provide the initial set of Router5 Routes to be used by this application.
     */
    getRoutes(): Route[] {
        return [];
    }

    /**
     * Provide a list of app-wide options to be displayed in the App's built-in Options
     * dialog, accessible from the default AppBar menu when this method returns non-empty.
     * @see AppOption
     */
    getAppOptions(): AppOptionSpec[] {
        return [];
    }

    /**
     * Provide a list of app-wide metadata and version information to be displayed in the
     * App's built-in About dialog.
     */
    getAboutDialogItems(): AboutDialogItem[] {
        const XH = window['XH'],
            svc = XH.environmentService;

        return [
            {label: 'App', value: `${svc.get('appName')} (${svc.get('appCode')})`},
            {label: 'Current User', value: XH.identityService.username},
            {label: 'Environment', value: svc.get('appEnvironment')},
            {label: 'Instance', value: svc.serverInstance},
            {label: 'Server', value: `${svc.get('appVersion')} (build ${svc.get('appBuild')})`},
            {
                label: 'Client',
                value: `${svc.get('clientVersion')} (build ${svc.get('clientBuild')})`
            },
            {label: 'Hoist Core', value: svc.get('hoistCoreVersion')},
            {label: 'Hoist React', value: svc.get('hoistReactVersion')},
            {label: 'User Agent', value: window.navigator.userAgent},
            {label: 'WebSockets', value: webSocketIndicator()}
        ];
    }

    /**
     * Resets user preferences and any persistent local application state.
     *
     * The default implementation for this method will clear *all* preferences and local storage.
     *
     * Applications may wish to override this method to do a more targeted clearing of state.
     * This is important for complex applications with smaller sub-applications, and/or device
     * specific applications. These applications will typically want to perform a custom clearing
     * that is more targeted, and includes any additional app-specific state.
     */
    async restoreDefaultsAsync() {
        const XH = window['XH'];
        await XH.prefService.clearAllAsync();
        XH.localStorageService.clear();
    }
}

/** Object Describing an entry in the AboutDialog. */
export interface AboutDialogItem {
    label: ReactNode;
    value: ReactNode;
    omit?: Thunkable<boolean>;
}
