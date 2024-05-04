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
import {isEmpty} from 'lodash';

interface AuthZeroOauthConfig extends BaseOauthConfig {
    /** Domain of your app registered with Auth0 */
    domain: string;
}

/**
 * This class supports OAuth via an integration with Auth0, a cross-platform service
 * supporting login via Google, GitHub, or Microsoft identities *or* via a username/password combo
 * created by the user in the Auth0 registration flow (and stored on Auth0 servers).
 *
 * Auth0 grants these scopes by default if idScopes are not set:
 * openid, profile, email
 */
export class AuthZeroOauthService extends BaseOauthService {
    static instance: AuthZeroOauthService;

    private client: Auth0Client;
    private user: PlainObject; // Authenticated user info as provided by Auth0.

    protected async doInitAsync(): Promise<void> {

        const client = this.client = this.createClient();
        if (!(await client.isAuthenticated())) {
            this.useRedirect ?
                await this.completeRedirectAuthAsync() :
                await this.completePopupAuthAsync()
        }

        // If we get here without exception, we should be set, but throw if not.
        this.user = await client.getUser();
        this.idToken = (await client.getIdTokenClaims())?.__raw;
        throwIf(!this.user || !this.idToken, 'Failed Auth0 authentication. No user or token found.');

        this.logInfo(`Authenticated OK`, this.user.email, this.user);
    }

    override async doLogoutAsync(): Promise<void> {
        const {client} = this;
        if (!(await client.isAuthenticated())) return;
        await client.logout({
            logoutParams: {
                returnTo: this.postLogoutRedirectUrl
            }
        });
        // Wait enough time for Auth0 logout to complete before any reload.
        await wait(10 * SECONDS);
    }

    //------------------
    // Implementation
    //-----------------
    private createClient(): Auth0Client {
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
        return new Auth0Client(auth0ClientOptions);
    }

    private async completeRedirectAuthAsync(): Promise<void> {
        const {client} = this;

        // Determine if we are on back end of redirect.  (recipe from Auth0 docs)
        const {search} = location,
            isReturning = (search.includes('state=') && search.includes('code=')) || search.includes('error=');

        // 1) Returning: call 0Auth method to complete, and restore url/history state
        if (isReturning) {
            const {appState} = await client.handleRedirectCallback(),
                redirectState = this.getRedirectState(appState);

            throwIf(!redirectState, "Failure in oAuth, no redirect state located.")
            const {search} = redirectState,
                url = isEmpty(search) ? '/' :  location.origin + location.pathname + '?' + search;
            window.history.replaceState(null, '', url);
            return;
        }

        // 2) Initiating:  grab url state and send initiate redirect.
        const appState = this.setRedirectState({search})
        await client.loginWithRedirect({appState});
        await never();
    }

    private async completePopupAuthAsync(): Promise<void> {
        const {client} = this;

        try {
            await client.loginWithPopup();
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
