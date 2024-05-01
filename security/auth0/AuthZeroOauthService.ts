/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {Auth0Client, Auth0ClientOptions} from '@auth0/auth0-spa-js';
import {PlainObject, XH} from '@xh/hoist/core';
import {never, wait} from '@xh/hoist/promise';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {BaseOauthConfig, BaseOauthService} from '../BaseOauthService';

interface AuthZeroOauthConfig extends BaseOauthConfig {
    /** Domain of your app registered with Auth0 */
    domain: string;
}

/**
 * Coordinates OAuth-based login for the user-facing desktop and mobile apps.
 *
 * This class suppors OAuth via an integration with Auth0, a cross-platform service
 * supporting login via Google, GitHub, or Microsoft identities *or* via a username/password combo
 * created by the user in the Auth0 registration flow (and stored on Auth0 servers).
 *
 * Auth0 grants these scopes by default if idScopes are not set:
 * openid, profile, email
 *
 * TODO - preserve an incoming route for a non-authenticated user. Currently any route will be
 *      lost during the redirect flow. We should be able to note and restore via the `state`
 *      key we can set and then read on our Auth0 login request / post-redirect response.
 */
export class AuthZeroOauthService extends BaseOauthService {
    static instance: AuthZeroOauthService;

    private auth0: Auth0Client;
    private user: PlainObject; // Authenticated user info as provided by Auth0.

    protected async doInitAsync(): Promise<void> {
        const config = this.config as AuthZeroOauthConfig,
            {clientId, domain, idScopes} = config;

        throwIf(!domain, 'Missing Auth0 domain. Please review your configuration.');

        const auth0ClientOptions: Auth0ClientOptions = {
            clientId,
            domain,
            authorizationParams: {redirect_uri: this.redirectUrl},
            cacheLocation: 'localstorage'
        };
        if (idScopes) {
            auth0ClientOptions.authorizationParams.scope = idScopes.join(' ');
        }
        const auth0 = (this.auth0 = new Auth0Client(auth0ClientOptions));

        // Initial check to see if we already have valid, cached credentials.
        let isAuthenticated = await auth0.isAuthenticated();

        // If not, presence of query params used here as an indicator that we *might* be returning
        // from an Auth0 redirect. Safely call handler to see if we have had a successful auth.
        const qString = window.location.search;
        if (!isAuthenticated && qString) {
            try {
                await auth0.handleRedirectCallback();
                isAuthenticated = await auth0.isAuthenticated();

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
            await this.loginAsync();
        }

        // Otherwise we should be able to ask Auth0 for user and token info.
        this.user = await auth0.getUser();
        this.idToken = (await auth0.getIdTokenClaims())?.__raw;

        this.logInfo(`Authenticated OK`, this.user?.email, this.user);
    }

    override async doLogoutAsync(): Promise<void> {
        const {auth0} = this,
            isAuthenticated = await auth0.isAuthenticated();
        if (!isAuthenticated) return;
        await auth0.logout({
            logoutParams: {
                returnTo: this.postLogoutRedirectUrl
            }
        });
        // Wait enough time for Auth0 logout to redirect us away - if we return *too* soon
        // XH.identityService will reload the app first before Oauth logout complete.
        await wait(10 * SECONDS);
    }

    //------------------
    // Implementation
    //-----------------
    private async loginAsync(): Promise<void> {
        const {auth0} = this;
        this.logInfo(`Not authenticated - logging in....`);

        // Redirect.
        if (this.useRedirect) {
            await auth0.loginWithRedirect();
            await never();
            return;
        }

        // Popup
        try {
            await auth0.loginWithPopup();
        } catch (e) {
            const msg = e.message?.toLowerCase();
            if (msg === 'timeout') {
                e.popup?.close();
                throw XH.exception({
                    name: 'Auth0 Login Error',
                    message:
                        'Login popup window timed out. Please reload the browser to try again.',
                    cause: e
                });
            }

            if (msg === 'popup closed') {
                throw XH.exception({
                    name: 'Auth0 Login Error',
                    message: 'Login popup window closed. Please reload the browser to try again.',
                    cause: e
                });
            }

            if (msg.includes('unable to open a popup')) {
                throw XH.exception({
                    name: 'Auth0 Login Error',
                    message: this.popupBlockerErrorMessage,
                    cause: e
                });
            }

            this.logError('Unhandled loginAsync error | will return null', e);
            e.popup?.close();
        }
    }
}
