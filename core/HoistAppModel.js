/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {applyMixin} from '@xh/hoist/utils/js';
import {HoistModel} from './HoistModel';
import {LoadSupport} from './mixins/LoadSupport';

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
    return applyMixin(C, {
        name: 'HoistAppModel',
        includes: [HoistModel, LoadSupport],

        defaults: {

            /**
             * Hoist will call this method after Hoist services have initialized and the application
             * has mounted. Use to trigger initialization of the app and any app-specific services.
             *
             * Applications will typically use this method to install and initialize app-specific
             * services using one or more phased calls to XH.installServicesAsync().
             */
            async initAsync() {},

            /**
             * Hoist will call this method during the global refresh process.
             *
             * This will be called after all core Hoist services have been refreshed and before the
             * application's global XH.refreshContextModel has been refreshed.
             *
             * Apps should implement this method to refresh all app-specific services, respecting any
             * ordering and phasing requirements that may exist.
             */
            async doLoadAsync(loadSpec) {},

            /**
             * Provide the initial set of Router5 Routes to be used by this application.
             */
            getRoutes() {
                return [];
            },

            /**
             * Provide a list of app-wide options to be displayed in the app's Options Dialog,
             * accessible from the default AppBar menu when this method returns non-empty.
             *
             * @returns {Object[]} - AppOption configs
             * @see AppOption
             */
            getAppOptions() {
                return [];
            }
        }
    });
}