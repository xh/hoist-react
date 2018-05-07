/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from 'hoist/core';

/**
 * Top level application model for a HoistApp.   This model will be initialized by Hoist after the
 * framework has successfully initialized and will remain available to all code via that XH.appModel getter.
 *
 * Applications should specify this class to provide application level state and services and customize
 * important metadata.  Initialization of all resources (e.g. application level services)  should be done in initApp().
 *
 * A subclass or decorated version of this class should be provided to XH.renderApp() in the main application bootstrap
 * file.
 */
@HoistModel()
export class BaseAppModel {

    /**
     * Should applications display a logout option - i.e. for apps using form-based auth
     * where logging out is a supported operation. Expected to be false for SSO apps.
     */
    enableLogout = true;

    /**
     * Is SSO authentication expected / required for this application? If true, will prevent display of the
     * loginPanel form and instead display a lockoutPanel if the user cannot be identified.
     */
    requireSSO = false;

    /**
     * Call this once when application mounted in order to trigger initial
     * authentication and initialization of application.
     */
    async initAsync() {}

    /**
     * Provide the initial set of Router5 Routes to be used by this application.
     */
    getRoutes() {
        return [];
    }
}