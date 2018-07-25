/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {defaultMethods} from '@xh/hoist/utils/ClassUtils';
import {HoistModel} from './HoistModel';

/**
 * Mixin for defining a Hoist Application. An instance of this class will be initialized by Hoist
 * after the framework has successfully initialized and will remain available to all code via the
 * XH.app getter.
 *
 * Applications should specify this class to provide application level state and services and
 * customize important metadata. Initialization of all resources (e.g. application level services)
 * should be done in initApp().
 *
 * A class decorated with this function should be provided to XH.renderApp() in the main
 * application bootstrap file.
 */
export function HoistApp(C) {
    C.isHoistApp = true;

    C = HoistModel()(C);

    defaultMethods(C, {

        /**
         * Container component to be used to host this application.
         *
         * This class is platform specific, and should be typically either
         * @xh/hoist/desktop/AppContainer or
         * @xh/hoist/mobile/AppContainer.
         *
         * No default is specified here to avoid extraneous inclusion of platform specific code.
         */
        containerClass: {
            get() {return null}
        },

        /**
         * Component class for rendering this app.  Should be a subclass of Component
         * and decorated with @HoistComponent.
         */
        componentClass: {
            get() {return null}
        },

        /**
         * Should applications display a logout option - i.e. for apps using form-based auth
         * where logging out is a supported operation. Expected to be false for SSO apps.
         */
        enableLogout: {
            get() {return false}
        },

        /**
         * Is SSO authentication expected / required for this application? If true, will prevent display
         * of the loginPanel form and instead display a lockoutPanel if the user cannot be identified.
         */
        requireSSO: {
            get() {return false}
        },

        /**
         * App must implement this method with appropriate logic to determine if the
         * current user should be able to access the UI, typically based on the user's roles.
         * @param {Object} user - current user, as returned by XH.getUser().
         */
        checkAccess(user) {
            return {
                hasAccess: false,
                message: 'Required access control not implemented - see App.checkAccess().'
            };
        },

        /**
         * Is app suspension by IdleService disabled?
         *
         * @see IdleService.  App suspension is also configurable in soft config, and via user preference.
         */
        idleDetectionDisabled: {
            get() {return false}
        },

        /**
         * Component to indicate App has been suspended.
         *
         * The component will receive a single prop -- onReactivate -- a callback called when user has acknowledged
         *      the suspension and wishes to reload the app and continue working.
         *
         * @see IdleService.
         */
        suspendedDialogClass:  {
            get() {return null}
        },

        /**
         * Is the app designed to be run on mobile devices?
         */
        isMobile: {
            get() {return false}
        },

        /**
         * Call this once when application mounted in order to trigger initial authentication and
         * initialization of the application and its services.
         */
        async initAsync() {},

        /**
         * Provide the initial set of Router5 Routes to be used by this application.
         */
        getRoutes() {
            return [];
        }
    });

    return C;
}