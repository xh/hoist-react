/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from './HoistModel';
/**
 * Specialized base class for defining the central model for a Hoist app as specified by its
 * {@see AppSpec.modelClass} config. That config should reference a concrete implementation class
 * extending this base. Hoist will create and then initialize an instance of that class after
 * the framework has successfully initialized and will make it available to all app code via the
 * `XH.appModel` getter.
 *
 * Applications should specify this class to provide application level state and services and
 * customize important metadata. Initialization of all resources (e.g. application level services)
 * should be done in `initAsync()`.
 *
 * Hoist will load/reload this Model during the global refresh process.  This will occur before the
 * application's global XH.refreshContextModel has been refreshed, (when all mounted and 'owned'
 * HoistModels in the application are refreshed). AppModels should implement `doLoadAsync()` if
 * required to refresh all other app-wide services and models, respecting any ordering and phasing
 * requirements specific to its needs. {@see HoistModel.doLoadAsync()}
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
     * Called by {@see IdentityService.logoutAsync} to provide an app-specific hook prior
     * to logging out an authenticated user. Applicable only to apps that generally support
     * logout (i.e. not SSO) and require handling in addition to Hoist server logout.
     */
    async logoutAsync() {}

    /**
     * Provide the initial set of Router5 Routes to be used by this application.
     */
    getRoutes() {
        return [];
    }

    /**
     * Provide a list of app-wide options to be displayed in the App's built-in Options
     * dialog, accessible from the default AppBar menu when this method returns non-empty.
     * @see AppOption
     *
     * @returns {Object[]} - AppOption configs. An additional `omit` property is supported
     *      here that, if true, will skip construction of that particular option and drop
     *      it out of the Options dialog.
     */
    getAppOptions() {
        return [];
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
        await window.XH.prefService.clearAllAsync();
        window.XH.localStorageService.clear();
    }
}
