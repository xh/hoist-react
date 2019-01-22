/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {defaultMethods, markClass} from '@xh/hoist/utils/js';
import {HoistModel} from './HoistModel';
import {RefreshModel} from './RefreshModel';

/**
 * Mixin for defining a Hoist Application. An instance of this class will be initialized by Hoist
 * after the framework has successfully initialized and will remain available to all code via the
 * XH.appModel getter.
 *
 * Applications should specify this class to provide application level state and services and
 * customize important metadata. Initialization of all resources (e.g. application level services)
 * should be done in initAsync().
 */
export function HoistAppModel(C) {
    markClass(C, 'isHoistAppModel');

    C = HoistModel(C);

    defaultMethods(C, {

        /**
         * Hoist will call this method once Hoist services have initialized and the application
         * has mounted. Use to trigger initialization of the app and any app-specific services.
         */
        async initAsync() {},

        /**
         * Provide the initial set of Router5 Routes to be used by this application.
         */
        getRoutes() {
            return [];
        },

        /**
         * @member {RefreshModel}
         *
         * Apps can use this model to trigger refreshes, and control auto-refresh behavior.
         * This model is also called by the default refresh button in the AppBar component.
         */
        get refreshModel() {
            if (!this._refreshModel) {
                this.refreshModel = new RefreshModel();
            }
            return this.refreshModel;
        }
    });

    return C;
}