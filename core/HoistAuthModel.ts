/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, PlainObject, XH} from './';

/**
 *  Base class for managing authentication lifecycle.
 *
 *  Hoist will consult this model early in  the initialization sequence, prior to full Hoist
 *  initialization. This means that several core services (identity, configs, prefs) will *not* be
 *  available, but it provides the app a hook to do early service initialization or other work to
 *  support flows such as OAuth.
 *
 *  The base implementation of this class is minimal and would be adequate only for fully
 *  transparent SSO based solutions such as NTLM.  Applications wishing to provide custom
 *  authentication should spec an extended version of this class in the {@link AppSpec} passed to
 *  {@link XHApi#renderApp}.
 */
export class HoistAuthModel extends HoistModel {
    static instance: HoistAuthModel;

    /**
     * Main Entry Point.
     *
     * This method will be called *once* by Hoist early in the app loading lifecycle to determine
     * if full app loading can proceed.
     *
     * It should return true if the user could be successfully authenticated, false if the user
     * is not authenticated, and throw in the case of technical failure. If false is returned and
     * `AppSpec.enableLoginForm` is true the framework will enter the 'LOGIN_REQUIRED' state and
     * show the user a form-based login with username and password fields to be submitted securely
     * to the server.
     *
     * The default implementation of this method simply checks the auth status on the server, which
     * may be appropriate for fully SSO (e.g. NTLM) based solutions. Override to consult or
     * initialize third-party client resources such as OAuth.
     *
     * @returns true if the user has an authenticated session with the server, false if not.
     */
    async completeAuthAsync(): Promise<boolean> {
        return this.getAuthStatusFromServerAsync();
    }

    /**
     * @returns true if the user has an authenticated session with the server, false if not.
     */
    async getAuthStatusFromServerAsync(): Promise<boolean> {
        return XH.fetchJson({url: 'xh/authStatus'})
            .then(r => r.authenticated)
            .catch(e => {
                if (e.httpStatus === 401) return false;
                throw e;
            });
    }

    /**
     * Process a manual login, submitted by user via form.
     * @returns true if the user was successfully logged in, false if not.
     */
    async loginWithCredentialsAsync(username: string, password: string): Promise<boolean> {
        return XH.fetchJson({
            url: 'xh/login',
            params: {username, password}
        }).then(r => r.success);
    }

    /**
     * Logout this user with the backend server.
     *
     * The default implementation will call the 'logout' endpoint on the Grails server, clearing
     * any server-side session state there. Override to manage any client-side or third-party state.
     */
    async logoutAsync(): Promise<void> {
        await XH.fetchJson({url: 'xh/logout'});
    }

    /**
     * Load auth-related config from the server via an /xh/ endpoint that is specifically
     * whitelisted by Hoist to allow access prior to user authentication. For use in bootstrapping
     * client-side auth solutions that require configs such as OAuth endpoint URLs and client IDs.
     * See `BaseAuthenticationService.getClientConfig()` in hoist-core.
     */
    async loadConfigAsync(): Promise<PlainObject> {
        return XH.fetchService.getJson({url: 'xh/authConfig'});
    }
}
