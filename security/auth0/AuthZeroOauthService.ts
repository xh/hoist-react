/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {Auth0Client, Auth0ClientOptions} from '@auth0/auth0-spa-js';
import {XH} from '@xh/hoist/core';
import {never, wait} from '@xh/hoist/promise';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {BaseOauthConfig, BaseOauthService} from '../BaseOauthService';

interface AuthZeroOauthConfig extends BaseOauthConfig {
    /** Domain of your app registered with Auth0 */
    domain: string;
}

/**
 * This class supports OAuth via an integration with Auth0, a cross-platform service
 * supporting login via Google, GitHub, or Microsoft identities *or* via a username/password combo
 * created by the user in the Auth0 registration flow (and stored on Auth0 servers).
 */
export class AuthZeroOauthService extends BaseOauthService {
    static instance: AuthZeroOauthService;

    private client: Auth0Client;

    protected async doInitAsync(): Promise<void> {

        const client = this.client = this.createClient();
        if (!(await client.isAuthenticated())) {
            this.loginMethod === 'REDIRECT' ?
                await this.completeViaRedirectAsync() :
                await this.completeViaPopupAsync();

            const user = await client.getUser();
            this.logDebug(`(Re)authenticated OK via Auth0`, user.email, user);
        }

        // If we get here without exception, we *should* be set
        this.idToken = (await client.getIdTokenClaims())?.__raw;
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

    override async getAccessTokenAsync(
        scopes: string[],
        allowPopup: boolean = false
    ): Promise<string> {
        const opts = {authorizationParams: {scope: scopes.join(' ')}};
        let ret = await this.client.getTokenSilently(opts);
        if (!ret && allowPopup) {
            ret = await this.client.getTokenWithPopup(opts);
        }
        return ret;
    }

    //------------------
    // Implementation
    //-----------------
    private createClient(): Auth0Client {
        const config = this.config as AuthZeroOauthConfig,
            {clientId, domain} = config;

        throwIf(!domain, 'Missing Auth0 domain. Please review your configuration.');

        return new Auth0Client({
            clientId,
            domain,
            authorizationParams: {
                scopes: this.idScopes.join(' '),
                redirect_uri: this.redirectUrl
            },
            cacheLocation: 'localstorage'
        });
    }

    private async completeViaRedirectAsync(): Promise<void> {
        const {client} = this;

        // Determine if we are on back end of redirect.  (recipe from Auth0 docs)
        const {search} = window.location,
            isReturning = (search.includes('state=') && search.includes('code=')) || search.includes('error=');

        if (!isReturning) {
            // 1) Initiating - grab state and initiate redirect
            const appState = this.captureRedirectState();
            await client.loginWithRedirect({appState});
            await never();
        } else {
            // 2) Returning - call client to complete redirect, and restore state
            const {appState} = await client.handleRedirectCallback();
            this.restoreRedirectState(appState);
        }
    }

    private async completeViaPopupAsync(): Promise<void> {
        const {client} = this;
        try {
            await client.loginWithPopup();
        } catch (e) {
            const msg = e.message?.toLowerCase();
            e.popup?.close();
            if (msg === 'timeout') {
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

            throw e;
        }
    }
}
