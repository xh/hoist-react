/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {hoistModel} from 'hoist/core';
import {action, observable} from 'hoist/mobx';
import {wait} from 'hoist/promise';

/**
 * Top level model for a HoistApp.
 * Applications should override this class to initialize services and provide shared application state.
 */
export class BaseAppModel {

    /**
     * Should applications display a logout option - i.e. for apps using form-based auth
     * where logging out is a supported operation. Expected to be false for SSO apps.
     */
    enableLogout = true;

    /**
     * Is SSO authentication expected / required for this application? If true, will
     * prevent display of the loginPanel form and instead display a lockoutPanel if the
     * user cannot be identified.
     */
    requireSSO = false;

    @observable route;

    constructor() {
        hoistModel.appModel = this;
        window.onhashchange = () => this.updateRoute();
        wait(1).then(() => this.updateRoute());
    }

    /**
     * Call this once when application mounted in order to
     * trigger initial authentication and initialization of application.
     */
    async initAsync() {}

    /**
     * Refresh the route to match the browser url
     */
    @action
    updateRoute() {
        const route = window.location.hash.substring(1);
        this.route = route.length ? route : '';
    }

}