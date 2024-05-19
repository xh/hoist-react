/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {BannerSpec, HoistBase, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {TokenInfo} from '@xh/hoist/security/TokenInfo';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES, olderThan, SECONDS} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {
    defaultsDeep,
    every,
    find,
    forEach,
    isNil,
    isObject,
    keys,
    mapValues,
    some,
    union
} from 'lodash';
import {v4 as uuid} from 'uuid';
import {action, makeObservable, observable, runInAction} from '@xh/hoist/mobx';

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
    loginMethodDesktop?: 'REDIRECT' | 'POPUP';

    /** The method used for logging in on mobile. Default is 'REDIRECT'. */
    loginMethodMobile?: 'REDIRECT' | 'POPUP';

    /**
     * Governs how frequently we attempt to refresh tokens with the API.
     *
     * A typical refresh will use the underlying provider cache, and should not result in network
     * activity. However, if the token lifetime falls below`tokenSkipCacheSecs`, this client
     * will force a call to the underlying provider to get the token.
     *
     * In order to allow aging tokens to be replaced in a timely manner, this value should be
     * significantly shorter than both the minimum token lifetime that will be
     * returned by the underlying API and `tokenSkipCacheSecs`. Default is 30 secs.
     */
    tokenRefreshSecs?: number;

    /**
     * When the remaining token lifetime is below this threshold, force the provider to skip the
     * local cache and go directly to the underlying provider for a new token. Default is 180 secs.
     */
    tokenSkipCacheSecs?: number;

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

    /**
     * True to display a warning banner to the user if tokens expire. May be specified as a boolean
     * or a partial banner spec. Defaults to false.
     */
    expiryWarning?: boolean | Partial<BannerSpec>;
}

/**
 * Implementations of this class coordinate OAuth-based login and token provision. Apps can use a
 * suitable concrete implementation to power a client-side OauthService - see Toolbox for an
 * example using `Auth0Client`.
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

    @observable.ref protected _idToken: TokenInfo;
    @observable protected _accessTokens: Record<string, TokenInfo>;

    @managed private timer: Timer;
    private expiryWarningDisplayed: boolean;
    private lastRefreshAttempt: number;

    private TIMER_INTERVAL = 2 * SECONDS;

    //------------------------
    // Public API
    //------------------------
    /**
     * ID token in JWT format. Observable.
     */
    get idToken(): string {
        return this._idToken?.token;
    }

    /**
     * Get a configured Access token in JWT format. Observable.
     */
    getAccessToken(key: string): string {
        return this._accessTokens[key]?.token;
    }

    constructor(config: C) {
        super();
        makeObservable(this);
        this.config = defaultsDeep(config, {
            loginMethodDesktop: 'REDIRECT',
            loginMethodMobile: 'REDIRECT',
            redirectUrl: 'APP_BASE_URL',
            postLogoutRedirectUrl: 'APP_BASE_URL',
            expiryWarning: false,
            tokenRefreshSecs: 30,
            tokenSkipCacheSecs: 180
        } as C);
        throwIf(!config.clientId, 'Missing OAuth clientId. Please review your configuration.');

        this.idScopes = union(['openid', 'email'], config.idScopes);
        this._idToken = null;
        this._accessTokens = mapValues(config.accessTokens, () => null);
    }

    /**
     * Main entry point for this object.
     */
    async initAsync(): Promise<void> {
        await this.doInitAsync();
        this.timer = Timer.create({
            runFn: async () => this.onTimerAsync(),
            interval: this.TIMER_INTERVAL
        });
    }

    /**
     * Request a full logout from the underlying OAuth provider.
     */
    async logoutAsync(): Promise<void> {
        await this.doLogoutAsync();
    }

    //------------------------------------
    // Template methods
    //-----------------------------------
    protected abstract doInitAsync(): Promise<void>;

    protected abstract doLogoutAsync(): Promise<void>;

    protected abstract getIdTokenAsync(useCache: boolean): Promise<TokenInfo>;

    protected abstract getAccessTokenAsync(spec: S, useCache: boolean): Promise<TokenInfo>;

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

    protected get loginMethod(): 'REDIRECT' | 'POPUP' {
        return XH.isDesktop ? this.config.loginMethodDesktop : this.config.loginMethodMobile;
    }

    protected get usesRedirect(): boolean {
        return this.loginMethod == 'REDIRECT';
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

    /**
     * Load tokens from provider.
     *
     * @param useCache - true (default) to use local cache if available, or false to force a
     *      network request to fetch a fresh token.
     */
    protected async loadTokensAsync(useCache: boolean = true): Promise<void> {
        this.logDebug('Loading tokens from provider', `useCache=${useCache}`);

        const {_idToken, _accessTokens, config} = this,
            idToken = await this.getIdTokenSafeAsync(useCache),
            accessTokens: Record<string, TokenInfo> = {},
            accessTasks = mapValues(config.accessTokens, spec =>
                this.getAccessTokenAsync(spec, useCache)
            );
        for (const key of keys(accessTasks)) {
            accessTokens[key] = await accessTasks[key];
        }

        runInAction(() => {
            if (!_idToken?.equals(idToken)) {
                this._idToken = idToken;
                this.logDebug('Installed new Id Token', idToken.formattedExpiry, idToken.forLog);
            }

            forEach(accessTokens, (token, k) => {
                if (!_accessTokens[k]?.equals(token)) {
                    _accessTokens[k] = token;
                    this.logDebug(
                        `Installed new Access Token '${k}'`,
                        token.formattedExpiry,
                        token.forLog
                    );
                }
            });
        });
    }

    //-------------------
    // Implementation
    //-------------------
    private async getIdTokenSafeAsync(useCache: boolean): Promise<TokenInfo> {
        // Client libraries can apparently return expired idIokens when using local cache.
        // See: https://github.com/auth0/auth0-spa-js/issues/1089 and
        // https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/4206
        // Protect ourselves from this, without losing benefits of local cache.
        let ret = await this.getIdTokenAsync(useCache);
        if (useCache && ret.expiresWithin(this.config.tokenSkipCacheSecs)) {
            ret = await this.getIdTokenAsync(false);
        }

        // Paranoia -- we don't expect this after workaround above to skip cache
        throwIf(ret.expiresWithin(1 * MINUTES), 'Cannot get valid Id Token from provider.');
        return ret;
    }

    @action
    private async onTimerAsync(): Promise<void> {
        const {_idToken, _accessTokens, config, lastRefreshAttempt, TIMER_INTERVAL} = this,
            refreshSecs = config.tokenRefreshSecs * SECONDS,
            skipCacheSecs = config.tokenSkipCacheSecs * SECONDS;

        // 1) Periodically Refresh if we are missing a token, or a token is too close to expiry
        // NOTE -- we do this for all tokens at once, could be more selective.
        if (olderThan(lastRefreshAttempt, refreshSecs)) {
            this.lastRefreshAttempt = Date.now();
            try {
                const useCache =
                    _idToken &&
                    !_idToken.expiresWithin(skipCacheSecs) &&
                    every(_accessTokens, t => t && !t.expiresWithin(skipCacheSecs));
                await this.loadTokensAsync(useCache);
            } catch (e) {
                XH.handleException(e, {showAlert: false, logOnServer: false});
            }
        } else {
            // 2) Otherwise, if a token will expire before next check, clear it out.
            // Note that we don't expect to have to do this, if refresh above working fine.
            // This is the unhappy path, and will trigger warning, if configured.
            if (_idToken?.expiresWithin(TIMER_INTERVAL)) this._idToken = null;
            forEach(_accessTokens, (tkn, k) => {
                if (tkn?.expiresWithin(TIMER_INTERVAL)) _accessTokens[k] = null;
            });
        }

        // 3) Always update the warning state.
        this.updateWarning();
    }

    private updateWarning() {
        const {expiryWarning} = this.config;
        if (!expiryWarning) return;

        const expired = !this._idToken || some(this._accessTokens, isNil);
        if (this.expiryWarningDisplayed != expired) {
            this.expiryWarningDisplayed = expired;
            if (expired) {
                const onClick = () => XH.reloadApp();
                let spec: BannerSpec = {
                    category: 'xhOAuth',
                    message: 'Authentication expired.  Reload required',
                    icon: Icon.warning(),
                    intent: 'warning',
                    enableClose: false,
                    actionButtonProps: {text: 'Reload Now', onClick},
                    onClick
                };
                if (isObject(expiryWarning)) {
                    spec = {...spec, ...expiryWarning};
                }
                XH.showBanner(spec);
            } else {
                XH.hideBanner('xhOAuth');
            }
        }
    }
}
