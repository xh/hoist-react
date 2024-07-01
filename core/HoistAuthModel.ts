/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, PlainObject, XH} from './';

/**
 *  Base class for managing authentication lifecycle.
 *
 *  Hoist will consult this model early in  the initialization sequence, prior to
 *  full Hoist initialization. This means that several core services (identity, configs, prefs)
 *  will *not* be available, but it provides the app a hook to
 *  do early service initialization or other work to support flows such as OAuth.
 *
 *  The base implementation of this class is minimal and would be adequate only for fully
 *  transparent SSO based solutions such as NTLM.  Applications wishing to provide custom
 *  authentication should provide an extended version of this class to `XH.renderApp`
 */
export class HoistAuthModel extends HoistModel {
    /**
     * Main Entry Point
     *
     * This method will be called *once* by Hoist early in the app loading lifecycle to determine
     * if full app loading can proceed.
     *
     * It should return true if the user could be successfully authenticated, false if the user
     * is not authenticated, and throw in the case of technical failure. If false is returned and
     * `AppSpec.enableLoginForm` is true the framework will enter the 'loginRequired' state and
     * show the user a *manual* login form.
     *
     *  The default implementation of this method simply checks the auth status on the server, which
     *  may be appropriate for fully SSO (e.g. NTLM) based solutions.  Override to consult or
     *  initialize third-party client resources such as OAuth.
     */
    async completeAuthAsync(): Promise<boolean> {
        return this.getAuthStatusFromServerAsync();
    }

    /**
     * Confirm that this user has an authenticated session with the server.
     */
    async getAuthStatusFromServerAsync(): Promise<boolean> {
        return XH.fetchService
            .fetchJson({url: 'xh/authStatus'})
            .then(r => r.authenticated)
            .catch(e => {
                if (e.httpStatus === 401) return false;
                throw e;
            });
    }

    /**
     * Process a manual login, submitted by user via form.
     *
     * Return true if user is successfully logged in, otherwise false.
     */
    async loginFromFormAsync(username: string, password: string): Promise<boolean> {
        const resp = await XH.fetchJson({
            url: 'xh/login',
            params: {username, password}
        });
        return resp.success;
    }

    /**
     * Logout this user with the backend server.
     *
     * The default implementation will simply call the 'logout' endpoint
     * on the server, removing any server-state.  Override this method to
     * manage any client or third-party state.
     */
    async logoutAsync(): Promise<void> {
        await XH.fetchJson({url: 'xh/logout'});
    }

    /**
     * Load the login configuration from the server.
     *
     * This data is auth-system configuration data from the server, specifically provided by Hoist
     * without any auth requirements, for use in bootstrapping client-side auth.
     */
    async loadConfigAsync(): Promise<PlainObject> {
        return XH.fetchService.getJson({url: 'xh/authConfig'});
    }
}
