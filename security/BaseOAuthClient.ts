/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistBase, managed, XH} from '@xh/hoist/core';
import {Token, TokenMap} from '@xh/hoist/security/Token';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES, olderThan, SECONDS} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {find, forEach, isEmpty, keys, pickBy, union} from 'lodash';
import {v4 as uuid} from 'uuid';
import {action, makeObservable} from '@xh/hoist/mobx';

export type LoginMethod = 'REDIRECT' | 'POPUP';

export interface BaseOAuthClientConfig<S> {
    /** Client ID (GUID) of your app registered with your Oauth provider. */
    clientId: string;

    /**
     * The redirect URL where authentication responses can be received by your application.
     * It must exactly match one of the redirect URIs registered in the relevant OAuth authority.
     * Default is 'APP_BASE_URL' which will be replaced with the current app's base URL.
     */
    redirectUrl?: 'APP_BASE_URL' | string;

    /**
     * The redirect URL after a successful logout.
     * Default is 'APP_BASE_URL' which will be replaced with the current app's base URL.
     */
    postLogoutRedirectUrl?: 'APP_BASE_URL' | string;

    /** The method used for logging in on desktop. Default is 'REDIRECT'. */
    loginMethodDesktop?: LoginMethod;

    /** The method used for logging in on mobile. Default is 'REDIRECT'. */
    loginMethodMobile?: LoginMethod;

    /**
     * Governs an optional refresh timer that will work to keep the tokens fresh.
     *
     * A typical refresh will use the underlying provider cache, and should not result in
     * network activity. However, if any token lifetime falls below`autoRefreshSkipCacheSecs`,
     * this client will force a call to the underlying provider to get the token.
     *
     * In order to allow aging tokens to be replaced in a timely manner, this value should be
     * significantly shorter than both the minimum token lifetime that will be
     * returned by the underlying API and `autoRefreshSkipCacheSecs`.
     *
     * Default is -1, disabling this behavior.
     */
    autoRefreshSecs?: number;

    /**
     * During auto-refresh, if the remaining lifetime for any token is below this threshold,
     * force the provider to skip the local cache and go directly to the underlying provider for
     * new tokens and refresh tokens.
     *
     * Default is -1, disabling this behavior.
     */
    autoRefreshSkipCacheSecs?: number;

    /**
     * Scopes to request - if any - beyond the core `['openid', 'email']` scopes, which
     * this client will always request.
     */
    idScopes?: string[];

    /**
     * Optional map of access tokens to be loaded and maintained.
     *
     * Map of code to a spec for an access token.  The code is app-determined and
     * will simply be used to get the loaded token via tha getAccessToken() method. The
     * spec is implementation specific, but will typically include scopes to be loaded
     * for the access token and potentially other meta-data required by the underlying provider.
     *
     * Use this map to gain targeted access tokens for different back-end resources.
     */
    accessTokens?: Record<string, S>;
}

/**
 * Implementations of this class coordinate OAuth-based login and token provision. Apps can use a
 * suitable concrete implementation to power a client-side OauthService. See `MsalClient` and
 * `AuthZeroClient`
 *
 * Initialize such a service and this client within the `preAuthInitAsync()` lifecycle method of
 * `AppModel` to use the tokens it acquires to authenticate with the Hoist server. (Note this
 * requires a suitable server-side `AuthenticationService` implementation to validate the token and
 * actually resolve the user.) On init, the client implementation will initiate a pop-up or redirect
 * flow as necessary.
 */
export abstract class BaseOAuthClient<C extends BaseOAuthClientConfig<S>, S> extends HoistBase {
    /** Config loaded from UI server + init method. */
    protected config: C;

    /** Scopes */
    protected idScopes: string[];

    @managed private timer: Timer;
    private lastRefreshAttempt: number;

    private TIMER_INTERVAL = 2 * SECONDS;

    private accessSpecs: Record<string, S>;

    //------------------------
    // Public API
    //------------------------
    constructor(config: C) {
        super();
        makeObservable(this);
        this.config = {
            loginMethodDesktop: 'REDIRECT',
            loginMethodMobile: 'REDIRECT',
            redirectUrl: 'APP_BASE_URL',
            postLogoutRedirectUrl: 'APP_BASE_URL',
            expiryWarning: false,
            autoRefreshSecs: -1,
            autoRefreshSkipCacheSecs: -1,
            ...config
        };
        throwIf(!config.clientId, 'Missing OAuth clientId. Please review your configuration.');

        this.idScopes = union(['openid', 'email'], config.idScopes);
        this.accessSpecs = this.config.accessTokens;
    }

    /**
     * Main entry point for this object.
     */
    async initAsync(): Promise<void> {
        const tokens = await this.doInitAsync();
        this.logDebug('Successfully initialized with following tokens:');
        this.logTokensDebug(tokens);
        if (this.config.autoRefreshSecs > 0) {
            this.timer = Timer.create({
                runFn: async () => this.onTimerAsync(),
                interval: this.TIMER_INTERVAL
            });
        }
    }

    /**
     * Request an interactive login with the underlying OAuth provider.
     */
    async loginAsync(method: LoginMethod = this.loginMethod): Promise<void> {
        return method == 'REDIRECT' ? this.doLoginRedirectAsync() : this.doLoginPopupAsync();
    }

    /**
     * Request a full logout from the underlying OAuth provider.
     */
    async logoutAsync(): Promise<void> {
        await this.doLogoutAsync();
    }

    /**
     * Get an ID token.
     */
    async getIdTokenAsync(): Promise<Token> {
        return this.fetchIdTokenSafeAsync(true);
    }

    /**
     * Get a Access token.
     */
    async getAccessTokenAsync(key: string): Promise<Token> {
        return this.fetchAccessTokenAsync(this.accessSpecs[key], true);
    }

    /**
     * Get all available tokens.
     */
    async getAllTokensAsync(): Promise<TokenMap> {
        return this.fetchAllTokensAsync(true);
    }

    //------------------------------------
    // Template methods
    //-----------------------------------
    protected abstract doInitAsync(): Promise<TokenMap>;

    protected abstract doLoginPopupAsync(): Promise<void>;

    protected abstract doLoginRedirectAsync(): Promise<void>;

    protected abstract fetchIdTokenAsync(useCache: boolean): Promise<Token>;

    protected abstract fetchAccessTokenAsync(spec: S, useCache: boolean): Promise<Token>;

    protected abstract doLogoutAsync(): Promise<void>;

    //---------------------------------------
    // Implementation
    //---------------------------------------
    protected get redirectUrl() {
        const url = this.config.redirectUrl;
        return url === 'APP_BASE_URL' ? this.baseUrl : url;
    }

    protected get postLogoutRedirectUrl() {
        const url = this.config.postLogoutRedirectUrl;
        return url === 'APP_BASE_URL' ? this.baseUrl : url;
    }

    protected get loginMethod(): LoginMethod {
        return XH.isDesktop ? this.config.loginMethodDesktop : this.config.loginMethodMobile;
    }

    protected get baseUrl() {
        return `${window.location.origin}/${XH.clientAppCode}/`;
    }

    protected popupBlockerErrorMessage: String =
        'Login popup window blocked. Please check your browser for a blocked popup notification ' +
        '(typically within the URL bar). Allow all popups from this site, then refresh this page ' +
        'in your browser to try again.';

    protected defaultErrorMsg: String =
        'We are unable to authenticate you. Please ensure any pop-up windows or alternate ' +
        'browser tabs with this app open are fully closed, then refresh this tab in your browser ' +
        'to reload the application and try again.';

    /**
     * Call before redirect flow to snapshot any URL-based routing state that should be restored
     * after redirect
     *
     * @returns key - key for re-accessing this state, to be round-tripped with redirect.
     */
    protected captureRedirectState(): string {
        const {pathname, search} = window.location,
            state = {
                key: uuid(),
                timestamp: Date.now(),
                pathname,
                search
            };

        const recs = XH.localStorageService
            .get('xhOAuthState', [])
            .filter(r => !olderThan(r.timestamp, 5 * MINUTES));

        recs.push(state);
        XH.localStorageService.set('xhOAuthState', recs);
        return state.key;
    }

    /**
     * Call after redirect flow to rehydrate URL-based routing state.
     *
     * @param key - key for re-accessing this state, as round-tripped with redirect.
     */
    protected restoreRedirectState(key: string) {
        const state = find(XH.localStorageService.get('xhOAuthState', []), {key});
        throwIf(!state, 'Failure in OAuth, no redirect state located.');

        this.logDebug('Restoring Redirect State', state);
        const {search, pathname} = state;
        window.history.replaceState(null, '', pathname + search);
    }

    protected async fetchAllTokensAsync(useCache = true): Promise<TokenMap> {
        const ret: TokenMap = {},
            {accessSpecs} = this;
        ret.id = await this.fetchIdTokenSafeAsync(useCache);
        for (const key of keys(accessSpecs)) {
            ret[key] = await this.fetchAccessTokenAsync(accessSpecs[key], useCache);
        }
        return ret;
    }

    //-------------------
    // Implementation
    //-------------------
    private async fetchIdTokenSafeAsync(useCache: boolean): Promise<Token> {
        // Client libraries can apparently return expired idIokens when using local cache.
        // See: https://github.com/auth0/auth0-spa-js/issues/1089 and
        // https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/4206
        // Protect ourselves from this, without losing benefits of local cache.
        let ret = await this.fetchIdTokenAsync(useCache);
        if (useCache && ret.expiresWithin(1 * MINUTES)) {
            this.logDebug('Stale Id Token loaded from the cache, reloading without cache.');
            ret = await this.fetchIdTokenAsync(false);
        }

        // Paranoia -- we don't expect this after workaround above to skip cache
        throwIf(ret.expiresWithin(1 * MINUTES), 'Cannot get valid Id Token from provider.');
        return ret;
    }

    @action
    private async onTimerAsync(): Promise<void> {
        const {config, lastRefreshAttempt} = this,
            refreshSecs = config.autoRefreshSecs * SECONDS,
            skipCacheSecs = config.autoRefreshSkipCacheSecs * SECONDS;

        if (olderThan(lastRefreshAttempt, refreshSecs)) {
            this.lastRefreshAttempt = Date.now();
            try {
                this.logDebug('Refreshing all tokens:');
                let tokens = await this.fetchAllTokensAsync(),
                    aging = pickBy(
                        tokens,
                        v => skipCacheSecs > 0 && v.expiresWithin(skipCacheSecs)
                    );
                if (!isEmpty(aging)) {
                    this.logDebug(
                        `Tokens [${keys(aging).join(', ')}] have < ${skipCacheSecs}s remaining, reloading without cache.`
                    );
                    tokens = await this.fetchAllTokensAsync(false);
                }
                this.logTokensDebug(tokens);
            } catch (e) {
                XH.handleException(e, {showAlert: false, logOnServer: false});
            }
        }
    }

    private logTokensDebug(tokens: TokenMap) {
        forEach(tokens, (token, key) => {
            this.logDebug(`Token '${key}'`, token.formattedExpiry);
        });
    }
}
