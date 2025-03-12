/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import type {Auth0ClientOptions} from '@auth0/auth0-spa-js';
import {Auth0Client} from '@auth0/auth0-spa-js';
import {XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {Token} from '@xh/hoist/security/Token';
import {AccessTokenSpec, TokenMap} from '../Types';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {mergeDeep, throwIf} from '@xh/hoist/utils/js';
import {flatMap, union} from 'lodash';
import {BaseOAuthClient, BaseOAuthClientConfig} from '../BaseOAuthClient';

export interface AuthZeroClientConfig extends BaseOAuthClientConfig<AuthZeroTokenSpec> {
    /** Domain of your app registered with Auth0.  */
    domain: string;

    /**
     * Audience to pass to interactive login and ID token requests.
     *
     * If you are also requesting an *access* token for a single audience, pass that value here to
     * ensure that the initial login/token request returns a ready-to-use access token (and refresh
     * token) with a single request to the Auth0 API, instead of requiring two.
     *
     * This also avoids issues with browsers that block third party cookies when running on
     * localhost or with an Auth0 domain that does not match the app's own domain. In those cases,
     * Auth0 must use refresh tokens to obtain access tokens, and a single audience allows that
     * exchange to work without extra user interaction that this class does not currently support.
     */
    audience?: string;

    /**
     * Additional options for the Auth0Client ctor. Will be deep merged with defaults, with options
     * supplied here taking precedence. Use with care, as overriding defaults may have unintended
     * consequences or fail to work with Hoist's expected usage of the client library.
     */
    authZeroClientOptions?: Partial<Auth0ClientOptions>;
}

export interface AuthZeroTokenSpec extends AccessTokenSpec {
    /**
     * Audience (i.e. API) identifier for AccessToken.  Must be registered with Auth0.
     * Note that this is required to ensure that issued token is a JWT and not an opaque string.
     */
    audience: string;
}

/**
 * This class supports OAuth via an integration with Auth0, a commercial service supporting login
 * via Google, GitHub, Microsoft, and various other OAuth providers *or* via a username/password
 * combo stored and managed within Auth0's own database. Supported options will depend on the
 * configuration of your Auth0 app.
 *
 * Note: If developing on localhost and using Access Tokens will need to configure your browser to
 * allow third-party cookies.
 */
export class AuthZeroClient extends BaseOAuthClient<AuthZeroClientConfig, AuthZeroTokenSpec> {
    private client: Auth0Client;

    //-------------------------------------------
    // Implementations of core lifecycle methods
    //-------------------------------------------
    protected override async doInitAsync(): Promise<TokenMap> {
        const client = (this.client = this.createClient());

        // 0) Returning - call client to complete redirect, and restore state
        if (this.returningFromRedirect()) {
            this.logDebug('Completing Redirect login');
            const {appState} = await client.handleRedirectCallback();
            this.restoreRedirectState(appState);
            await this.noteUserAuthenticatedAsync();
            return this.fetchAllTokensAsync({eagerOnly: true});
        }

        // 1) If we are logged in, try to just reload tokens silently.  This is the happy path on
        // recent refresh.
        if (await client.isAuthenticated()) {
            try {
                this.logDebug('Attempting silent token load.');
                return await this.fetchAllTokensAsync({eagerOnly: true});
            } catch (e) {
                this.logDebug('Failed to load tokens on init, fall back to login', e.message ?? e);
            }
        }

        // 2) otherwise full-login
        this.logDebug('Logging in');
        await this.loginAsync();

        // 3) return tokens
        return this.fetchAllTokensAsync({eagerOnly: true});
    }

    protected override async doLoginRedirectAsync(): Promise<void> {
        const appState = this.captureRedirectState();

        await this.client.loginWithRedirect({
            appState,
            authorizationParams: {scope: this.loginScope}
        });

        await this.maskAfterRedirectAsync();
    }

    protected override async doLoginPopupAsync(): Promise<void> {
        try {
            await this.client.loginWithPopup({
                authorizationParams: {scope: this.loginScope}
            });
            await this.noteUserAuthenticatedAsync();
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

    protected override async fetchIdTokenAsync(useCache: boolean = true): Promise<Token> {
        const response = await this.client.getTokenSilently({
            authorizationParams: {scope: this.idScopes.join(' ')},
            cacheMode: useCache ? 'on' : 'off',
            detailedResponse: true
        });
        return new Token(response.id_token);
    }

    protected override async fetchAccessTokenAsync(
        spec: AuthZeroTokenSpec,
        useCache: boolean = true
    ): Promise<Token> {
        const value = await this.client.getTokenSilently({
            authorizationParams: {scope: spec.scopes.join(' '), audience: spec.audience},
            cacheMode: useCache ? 'on' : 'off'
        });
        return new Token(value);
    }

    protected override async doLogoutAsync(): Promise<void> {
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

    //------------------------
    // Private implementation
    //------------------------
    private createClient(): Auth0Client {
        const {clientId, domain, audience, authZeroClientOptions} = this.config;
        throwIf(!domain, 'Missing Auth0 "domain". Please review your config.');

        const mergedConfig = mergeDeep(
            {
                clientId,
                domain,
                useRefreshTokens: true,
                useRefreshTokensFallback: true,
                authorizationParams: {
                    scope: this.loginScope,
                    redirect_uri: this.redirectUrl,
                    audience
                },
                cacheLocation: 'localstorage'
            },
            authZeroClientOptions
        );

        this.logDebug(`Creating Auth0Client with merged config`, mergedConfig);
        return new Auth0Client(mergedConfig);
    }

    private get loginScope(): string {
        return union(this.idScopes, flatMap(this.config.accessTokens, 'scopes')).join(' ');
    }

    private returningFromRedirect(): boolean {
        // Determine if we are on back end of redirect (recipe from Auth0 docs)
        const {search} = window.location;
        return (search.includes('state=') && search.includes('code=')) || search.includes('error=');
    }

    private async noteUserAuthenticatedAsync() {
        const user = await this.client.getUser();
        this.setSelectedUsername(user.email);
        this.logDebug('User Authenticated', user.email);
    }
}
