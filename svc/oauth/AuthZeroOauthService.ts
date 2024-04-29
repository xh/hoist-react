/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {Auth0Client, AuthorizationParams} from '@auth0/auth0-spa-js';
import {HoistService, PlainObject, XH} from '@xh/hoist/core';
import {never, wait} from '@xh/hoist/promise';
import {SECONDS} from '@xh/hoist/utils/datetime';

/**
 * Coordinates OAuth-based login for the user-facing desktop and mobile apps.
 *
 * Oauth is supported via an integration with Auth0, a cross-platform service XH uses to provide
 * access to Toolbox via Google, GitHub, or Microsoft identities *or* via a username/password combo
 * created by the user in the Auth0 registration flow (and stored on Auth0 servers).
 *
 * This service is initialized in the `preAuthInitAsync()` lifecycle methods of the relevant
 * AppModels. It is instantiated and initialized prior to any attempts to authenticate to the app's
 * own Grails server. If the user is not authenticated, the Auth0 library will redirect to an Oauth
 * flow, then return here and process the completed authentication, supplying an identity token in
 * JWT format. This service then installs that token as a default header on all calls to the Toolbox
 * server, which looks for the token, validates its signature to verify, and uses it to lookup or
 * create an application user within `AuthenticationService.groovy`.
 *
 * TODO - preserve an incoming route for a non-authenticated user. Currently any route will be
 *      lost during the redirect flow. We should be able to note and restore via the `state`
 *      key we can set and then read on our Auth0 login request / post-redirect response.
 */

interface OauthConfig {
    /** Hoist: Is OAuth enabled in this application? */
    enabled: boolean;

    /** Client ID of your app registered with Auth0 */
    clientId: string;

    /** Domain of your app registered with Auth0 */
    domain: string;

    /**
     * The redirect URL where authentication responses can be received by your application.
     * It must exactly match one of the redirect URIs registered in the Auth0 dashboard.
     * Default is 'APP_BASE_URL' which will be replaced with the current app's base URL.
     */
    redirectUrl?: 'APP_BASE_URL' | string;

    /**
     * The redirect URL where the window navigates after a successful logout.
     * Default is 'APP_BASE_URL' which will be replaced with the current app's base URL.
     **/
    postLogoutRedirectUrl?: 'APP_BASE_URL' | string;

    /** The method used for logging in. Default is 'POPUP' on desktop and 'REDIRECT' on mobile. */
    loginMethod?: 'REDIRECT' | 'POPUP';

    /**
     * Scopes for ID token.
     * Can be left unset if Oauth is used only for Authentication, just to get username and email.
     * These scopes are granted by default if left unset:
     * 'openid profile email'
     **/
    idScopes?: string;
}

export class AuthZeroOauthService extends HoistService {
    static instance: AuthZeroOauthService;

    /**
     * Is OAuth enabled in this application?  For bootstrapping, troubleshooting
     * and mobile development, we allow running in a non-SSO mode.
     */
    enabled: boolean;

    auth0: Auth0Client;

    /** Authenticated user info as provided by Auth0. */
    user: PlainObject;
    /** ID Token in JWT format - for passing to Hoist server. */
    idToken: string;

    /** Soft-config loaded from whitelisted endpoint on UI server. */
    config: OauthConfig;

    get redirectUrl() {
        const url = this.config.redirectUrl ?? 'APP_BASE_URL';
        return url === 'APP_BASE_URL' ? this.baseUrl : url;
    }

    get postLogoutRedirectUrl() {
        const url = this.config.postLogoutRedirectUrl ?? 'APP_BASE_URL';
        return url === 'APP_BASE_URL' ? this.baseUrl: url;
    }

    // Default to redirect on mobile, popup on desktop.
    get useRedirect() {
        const {loginMethod} = this.config;
        if (loginMethod) {
            return loginMethod === 'REDIRECT';
        }

        return !XH.isDesktop;
    }

    override async initAsync() {
        // This service is initialized prior to Hoist auth/init, so we do *not* have our standard
        // XH.configService ready to go at the point we need these configs. This endpoint is
        // whitelisted in AuthenticationService.groovy to allow us to call it prior to auth.
        const config = (this.config = (await XH.fetchJson({
            url: 'oauthConfig'
        }).catchDefault()) as OauthConfig);

        this.enabled = config?.enabled;
        if (!this.enabled) {
            XH.appSpec.isSSO = false;
            return;
        }

        if (!config?.domain || !config?.clientId) {
            throw XH.exception(`
                Unable to init AuthZeroOauthService - expected config not returned by server.
                Please review the settings in configs "auth0ClientId" and "auth0Domain".
                Default values for these configs are provided in "Bootstrap.groovy"
            `);
        }

        const authorizationParams: AuthorizationParams = {
            redirect_uri: this.redirectUrl
        };
        if (config.idScopes) {
            authorizationParams.scope = config.idScopes;
        }

        const auth0 = (this.auth0 = new Auth0Client({
            clientId: config.clientId,
            domain: config.domain,
            authorizationParams
        }));

        // Initial check to see if we already have valid, cached credentials.
        let isAuthenticated = await this.checkAuthAsync();

        // If not, presence of query params used here as an indicator that we *might* be returning
        // from an Auth0 redirect. Safely call handler to see if we have had a successful auth.
        const qString = window.location.search;
        if (!isAuthenticated && qString) {
            try {
                await auth0.handleRedirectCallback();
                isAuthenticated = await this.checkAuthAsync();

                // Remove Auth0 query string from URL - will be left otherwise if app does not
                // do any routing on its own.
                const cleanUrl = window.location.toString().replace(qString, '');
                window.history.replaceState({}, document.title, cleanUrl);
            } catch (e) {
                this.logWarn(`Caught while attempting to get redirectResults`, e);
            }
        }

        if (!isAuthenticated) {
            // If still not authenticated, we are either coming in fresh or were unable to confirm a
            // successful auth via redirect handler. Trigger interactive login.
            this.logInfo(`Not authenticated - logging in....`);
            if (this.useRedirect) {
                await auth0.loginWithRedirect();
                await never();
            } else {
                await auth0.loginWithPopup();
            }
        }

        // Otherwise we should be able to ask Auth0 for user and token info.
        this.user = await this.auth0.getUser();
        this.idToken = await this.getIdTokenAsync();

        this.logInfo(`Authenticated OK`, this.user?.email, this.user);
        this.installDefaultFetchServiceHeaders();

    }

    //------------------
    // Implementation
    //-----------------
    private async getIdTokenAsync() {
        const claims = await this.auth0.getIdTokenClaims();
        return claims?.__raw;
    }

    private async checkAuthAsync(): Promise<boolean> {
        return this.auth0.isAuthenticated();
    }

    /**
     * Logout of both Hoist session and Auth0 Oauth session (if active).
     */
    async logoutAsync() {
        if (!this.enabled) return;
        try {
            const hasOauth = await this.checkAuthAsync();
            if (hasOauth) {
                // Logout of Hoist session here, as the auth0 logout will redirect us away, so
                // calling code from XH.identityService won't get a chance to do the Hoist logout.
                // If we are NOT logged into Oauth for some reason, this will return and the
                // standard identityService logout flow will resume.
                await XH.fetchJson({url: 'xh/logout'});
                await this.auth0.logout({
                    logoutParams: {
                        returnTo: this.postLogoutRedirectUrl
                    }
                });
                // Wait enough time for Auth0 logout to redirect us away - if we return *too* soon
                // XH.identityService will reload the app first before Oauth logout complete.
                await wait(10 * SECONDS);
            }
        } catch (e) {
            this.logError('Error during logout request', e);
        }
    }

    private installDefaultFetchServiceHeaders() {
        XH.fetchService.setDefaultHeaders(opts => {
            const {idToken} = this,
                relativeHoistUrl = !opts.url.startsWith('http');

            // Send XH ID token headers for requests to the Hoist server only - used to identify
            // our Hoist User via handling in server-side AuthenticationService.
            return relativeHoistUrl ? {'x-xh-idt': idToken} : {};
        });
    }

    private get baseUrl() {
        return `${window.location.origin}/${XH.clientAppCode}/`;
    }
}
