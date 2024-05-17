/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {Auth0Client} from '@auth0/auth0-spa-js';
import {PlainObject, XH} from '@xh/hoist/core';
import {never, wait} from '@xh/hoist/promise';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {flatMap, union} from 'lodash';
import {BaseOAuthClient, BaseOAuthClientConfig} from '../BaseOAuthClient';

export interface AuthZeroClientConfig extends BaseOAuthClientConfig<AuthZeroAccessTokenConfig> {
    /** Domain of your app registered with Auth0 */
    domain: string;
}

export interface AuthZeroAccessTokenConfig {
    /** Scopes for the desired access token.*/
    scopes: string[];

    /**
     * Audience (i.e. API) identifier for AccessToken.  Must be registered with Auth0.
     *
     * Note that this is required to ensure that issued token is a JWT and not
     * an opaque string.
     */
    audience: string;
}

/**
 * This class supports OAuth via an integration with Auth0, a commercial service supporting login
 * via Google, GitHub, Microsoft, and various other OAuth providers *or* via a username/password
 * combo stored and managed within Auth0's own database. Supported options will depend on the
 * configuration of your Auth0 app.
 */
export class AuthZeroClient extends BaseOAuthClient<AuthZeroClientConfig> {
    private client: Auth0Client;

    override async doInitAsync(): Promise<void> {
        const client = (this.client = this.createClient());

        if (await client.isAuthenticated()) {
            try {
                return await this.loadTokensAsync();
            } catch (e) {
                this.logDebug('Failed to load tokens on init, falling back on login', e);
            }
        }

        this.usesRedirect
            ? await this.completeViaRedirectAsync()
            : await this.completeViaPopupAsync();

        const user = await client.getUser();
        this.logDebug(`(Re)authenticated OK via Auth0`, user.email, user);

        // Second-time (after login) the charm!
        await this.loadTokensAsync();
    }

    override async getIdTokenAsync(useCache: boolean = true): Promise<string> {
        const response = await this.client.getTokenSilently({
            authorizationParams: {scope: this.idScopes.join(' ')},
            cacheMode: useCache ? 'on' : 'off',
            detailedResponse: true
        });
        return response.id_token;
    }

    override async getAccessTokenAsync(
        spec: PlainObject,
        useCache: boolean = true
    ): Promise<string> {
        return this.client.getTokenSilently({
            authorizationParams: {scope: spec.scopes.join(' '), audience: spec.audience},
            cacheMode: useCache ? 'on' : 'off'
        });
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
        const config = this.config,
            {clientId, domain} = config;

        throwIf(!domain, 'Missing Auth0 "domain". Please review your config.');

        const ret = new Auth0Client({
            clientId,
            domain,
            useRefreshTokens: true,
            useRefreshTokensFallback: true,
            authorizationParams: {
                scope: this.loginScope,
                redirect_uri: this.redirectUrl
            },
            cacheLocation: 'localstorage'
        });
        this.logDebug('Auth0 client created', ret);
        return ret;
    }

    private async completeViaRedirectAsync(): Promise<void> {
        const {client} = this;

        // Determine if we are on back end of redirect (recipe from Auth0 docs)
        const {search} = window.location,
            isReturning =
                (search.includes('state=') && search.includes('code=')) ||
                search.includes('error=');

        if (!isReturning) {
            // 1) Initiating - grab state and initiate redirect
            const appState = this.captureRedirectState();
            await client.loginWithRedirect({
                appState,
                authorizationParams: {scope: this.loginScope}
            });
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
            await client.loginWithPopup({authorizationParams: {scope: this.loginScope}});
        } catch (e) {
            const msg = e.message?.toLowerCase();
            e.popup?.close();
            if (msg === 'timeout') {
                throw XH.exception({
                    name: 'Auth0 Login Error',
                    message:
                        'Login popup window timed out. Please reload this tab in your browser to try again.',
                    cause: e
                });
            }

            if (msg === 'popup closed') {
                throw XH.exception({
                    name: 'Auth0 Login Error',
                    message:
                        'Login popup window closed. Please reload this tab in your browser to try again.',
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

    private get loginScope(): string {
        return union(this.idScopes, flatMap(this.config.accessTokens, 'scopes')).join(' ');
    }
}
