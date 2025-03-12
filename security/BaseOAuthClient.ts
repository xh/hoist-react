/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {br, fragment} from '@xh/hoist/cmp/layout';
import {HoistBase, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {action, makeObservable} from '@xh/hoist/mobx';
import {never, wait} from '@xh/hoist/promise';
import {Token} from '@xh/hoist/security/Token';
import {AccessTokenSpec, TokenMap} from './Types';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES, olderThan, ONE_MINUTE, SECONDS} from '@xh/hoist/utils/datetime';
import {isJSON, throwIf} from '@xh/hoist/utils/js';
import {find, forEach, isEmpty, isObject, keys, pickBy, toPairs, union} from 'lodash';
import ShortUniqueId from 'short-unique-id';

export type LoginMethod = 'REDIRECT' | 'POPUP';

export interface BaseOAuthClientConfig<S extends AccessTokenSpec> {
    /** Client ID (GUID) of your app registered with your Oauth provider. */
    clientId: string;

    /**
     * Redirect URL where authentication responses can be received by your application.
     * It must exactly match one of the redirect URIs registered in the relevant OAuth authority.
     * Default is 'APP_BASE_URL' which will be replaced with the current app's base URL.
     */
    redirectUrl?: 'APP_BASE_URL' | string;

    /**
     * Redirect URL after a successful logout.
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
     * network activity. However, if any token would expire before the next autoRefresh,
     * this client will force a call to the underlying provider to get the token.
     *
     * In order to allow aging tokens to be replaced in a timely manner, this value should be
     * significantly shorter than both the minimum token lifetime that will be
     * returned by the underlying API.
     *
     * Default is -1, disabling this behavior.
     */
    autoRefreshSecs?: number;

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
 * Initialize such a service and this client within an app's primary {@link HoistAuthModel} to use
 * the tokens it acquires to authenticate with the Hoist server. (Note this requires a suitable
 * server-side `AuthenticationService` implementation to validate the token and actually resolve
 * the user.) On init, the client impl will initiate a pop-up or redirect flow as necessary.
 */
export abstract class BaseOAuthClient<
    C extends BaseOAuthClientConfig<S>,
    S extends AccessTokenSpec
> extends HoistBase {
    /** Config loaded from UI server + init method. */
    protected config: C;

    /** ID Scopes */
    protected idScopes: string[];

    /** Specification for Access Tokens **/
    protected accessSpecs: Record<string, S>;

    @managed private timer: Timer;
    private lastRefreshAttempt: number;
    private TIMER_INTERVAL = 2 * SECONDS;

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
            autoRefreshSecs: -1,
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
        this.setSelectedUsername(null);
    }

    /**
     * Get an ID token.
     */
    async getIdTokenAsync(): Promise<Token> {
        return this.fetchIdTokenSafeAsync(true);
    }

    /**
     * Get an Access token.
     */
    async getAccessTokenAsync(key: string): Promise<Token> {
        return this.fetchAccessTokenAsync(this.accessSpecs[key], true);
    }

    /**
     * Get all configured tokens.
     */
    async getAllTokensAsync(opts?: {eagerOnly?: boolean; useCache?: boolean}): Promise<TokenMap> {
        return this.fetchAllTokensAsync(opts);
    }

    /**
     * The last authenticated OAuth username.
     *
     * Provided to facilitate more efficient re-login via SSO or otherwise. Cleared on logout.
     * Note: not necessarily a currently authenticated user, and not necessarily the Hoist username.
     */
    getSelectedUsername(): string {
        return this.getLocalStorage('xhOAuthSelectedUsername');
    }

    /**
     *  Set the last authenticated OAuth username.
     *  See `getSelectedUsername()`.
     */
    setSelectedUsername(username: string): void {
        this.setLocalStorage('xhOAuthSelectedUsername', username);
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

    protected get blankUrl() {
        return `${window.location.origin}/public/blank.html`;
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
            key = new ShortUniqueId({length: 8}).rnd(),
            state = {
                key,
                pathname,
                search,
                timestamp: Date.now()
            };

        const recs = this.getLocalStorage('xhOAuthState', []).filter(
            r => !olderThan(r.timestamp, 5 * MINUTES)
        );

        recs.push(state);
        this.setLocalStorage('xhOAuthState', recs);
        return state.key;
    }

    /**
     * Call after redirect flow to rehydrate URL-based routing state.
     *
     * @param key - key for re-accessing this state, as round-tripped with redirect.
     */
    protected restoreRedirectState(key: string) {
        const state = find(this.getLocalStorage('xhOAuthState', []), {key});
        throwIf(!state, 'Failure in OAuth, no redirect state located.');

        this.logDebug('Restoring Redirect State', state);
        const {search, pathname} = state;
        window.history.replaceState(null, '', pathname + search);
    }

    /** Call after requesting the provider library redirect the user away for auth. */
    protected async maskAfterRedirectAsync() {
        // We expect the tab to unload momentarily and be redirected to the provider's login page.
        // Wait here to ensure we mask the app while the browser processes the redirect...
        await wait(10 * SECONDS);

        // ...but also handle an observed edge case where the browser decided to open a new tab
        // instead of redirecting the current one (https://github.com/xh/hoist-react/issues/3899).
        // Show message below if/when user swaps back to the original tab, vs. endless spinner.
        await XH.alert({
            title: 'Auth / Redirect Error',
            message: fragment(
                'Authentication did not complete as expected / tab was not redirected.',
                br(),
                br(),
                'Please click below or refresh this tab in your browser to try again.'
            ),
            confirmProps: {text: 'Reload', icon: Icon.refresh(), intent: 'primary', minimal: false}
        });

        XH.reloadApp();

        // Ensure stale init does not progress - this tab should *really* be on its way out now!
        await never();
    }

    protected async fetchAllTokensAsync(opts?: {
        eagerOnly?: boolean;
        useCache?: boolean;
    }): Promise<TokenMap> {
        const eagerOnly = opts?.eagerOnly ?? false,
            useCache = opts?.useCache ?? true,
            accessSpecs = eagerOnly
                ? pickBy(this.accessSpecs, spec => spec.fetchMode === 'eager')
                : this.accessSpecs,
            ret: TokenMap = {};

        await Promise.allSettled(
            toPairs(accessSpecs).map(async ([key, spec]) => {
                try {
                    ret[key] = await this.fetchAccessTokenAsync(spec, useCache);
                } catch (e) {
                    XH.handleException(e, {logOnServer: true, showAlert: false});
                }
            })
        );

        // Do this after getting any access tokens --which can also populate the idToken cache!
        ret.id = await this.fetchIdTokenSafeAsync(useCache);

        return ret;
    }

    protected getLocalStorage(key: string, defaultValue: any = null): any {
        const val = window.localStorage.getItem(key);
        if (!val) return defaultValue;
        return isJSON(val) ? JSON.parse(val) : val;
    }

    protected setLocalStorage(key: string, value: any) {
        if (value == null) window.localStorage.removeItem(value);
        if (isObject(value)) value = JSON.stringify(value);
        window.localStorage.setItem(key, value);
    }

    //-------------------
    // Implementation
    //-------------------
    private async fetchIdTokenSafeAsync(useCache: boolean): Promise<Token> {
        // Client libraries can apparently return expired id tokens when using local cache.
        // See: https://github.com/auth0/auth0-spa-js/issues/1089 and
        // https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/4206
        // Protect ourselves from this, without losing benefits of local cache.
        let ret = await this.fetchIdTokenAsync(useCache);
        if (useCache && ret.expiresWithin(ONE_MINUTE)) {
            this.logDebug('Stale ID Token loaded from the cache, reloading without cache.');
            ret = await this.fetchIdTokenAsync(false);
        }

        // Paranoia -- we don't expect this after workaround above to skip cache
        throwIf(ret.expiresWithin(ONE_MINUTE), 'Cannot get valid ID Token from provider.');
        return ret;
    }

    @action
    private async onTimerAsync(): Promise<void> {
        const {config, lastRefreshAttempt} = this,
            refreshSecs = config.autoRefreshSecs * SECONDS,
            skipCacheSecs = refreshSecs + 5 * SECONDS;

        if (olderThan(lastRefreshAttempt, refreshSecs)) {
            this.lastRefreshAttempt = Date.now();
            try {
                this.logDebug('Refreshing all tokens:');
                let tokens = await this.fetchAllTokensAsync(),
                    aging = pickBy(tokens, v => v.expiresWithin(skipCacheSecs));
                if (!isEmpty(aging)) {
                    this.logDebug(
                        `Tokens [${keys(aging).join(', ')}] have < ${skipCacheSecs}s remaining, reloading without cache.`
                    );
                    tokens = await this.fetchAllTokensAsync({useCache: false});
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
