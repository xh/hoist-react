/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {BannerSpec, HoistBase, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES, olderThan, SECONDS} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {defaultsDeep, find, isObject, union} from 'lodash';
import {v4 as uuid} from 'uuid';
import {jwtDecode} from 'jwt-decode';
import {makeObservable, observable, runInAction} from 'mobx';

export interface BaseOauthClientConfig {
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
     * When the remaining token lifetime is below this threshold, try to refresh the token.
     * Should be substantially shorter than the lifetime of the tokens, but long enough so that
     * there is ample time to complete the refresh, including retries.  Default is 10 minutes.
     */
    tokenRefreshThresholdMins?: number;

    /**
     * Governs how frequently we attempt to refresh aging tokens. Should be short enough to allow
     * multiple attempts during `tokenRefreshThresholdMins`. Default is 30 seconds.
     */
    tokenRefreshCheckSecs?: number;

    /**
     * Scopes to request - if any - beyond the core `['openid', 'profile', 'email']` scopes, which
     * this client will always request.
     */
    scopes?: string[];

    /**
     * True to display a warning banner to the user if tokens expire. May be specified as a boolean
     * or a partial banner spec. Defaults to false.
     */
    expiryWarning: boolean | Partial<BannerSpec>;
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
 *
 * The configuration for this client will be a combination of local code-specified values enhanced
 * by values from the server `xhOAuthConfig` configuration.  Note that the server values will be
 * loaded directly by this object via a dedicated, white-listed endpoint to allow for  access early
 * in the app lifecycle.
 */
export abstract class BaseOauthClient<T extends BaseOauthClientConfig> extends HoistBase {
    /** Config loaded from UI server + init method. */
    protected config: T;

    /** Scopes */
    protected scopes: string[];

    @observable.ref private idInfo: TokenInfo;
    @observable.ref private accessInfo: TokenInfo;

    @managed private timer: Timer;
    private expiryWarningDisplayed: boolean;
    private lastRefreshAttempt: number;

    private TIMER_INTERVAL = 2 * SECONDS;

    //------------------------
    // Public API
    //------------------------
    /** ID Token in JWT format. */
    get idToken(): string {
        return this.idInfo?.token;
    }

    /** Access Token in JWT format. */
    get accessToken(): string {
        return this.accessInfo?.token;
    }

    constructor(config: Partial<T> = {}) {
        super();
        makeObservable(this);
        this.config = config as T;
    }

    /**
     * Main entry point for this object.
     */
    async initAsync(): Promise<void> {
        const config = (this.config = defaultsDeep(
            await XH.fetchJson({url: 'xh/oauthConfig'}),
            this.config,
            {
                loginMethodDesktop: 'REDIRECT',
                loginMethodMobile: 'REDIRECT',
                redirectUrl: 'APP_BASE_URL',
                postLogoutRedirectUrl: 'APP_BASE_URL',
                expiryWarning: false,
                tokenRefreshThresholdMins: 10,
                tokenRefreshCheckSecs: 30
            } as T
        ));

        this.logDebug('OAuth config merged from code and server', config);
        throwIf(!config.clientId, 'Missing OAuth clientId. Please review your configuration.');
        this.scopes = union(['openid', 'profile', 'email'], config.scopes);

        await this.doInitAsync();

        this.timer = Timer.create({
            runFn: async () => this.onTimerAsync(),
            interval: this.TIMER_INTERVAL
        });
    }

    /**
     * Request a full logout from Oauth provider.
     * Should redirect away from this app to the pre-configured URL.
     */
    async logoutAsync(): Promise<void> {
        try {
            // Logout of Hoist session here *before* oAuth implementations.
            await XH.fetchJson({url: 'xh/logout'});
            await this.doLogoutAsync();
        } catch (e) {
            this.logError('Error during logout', e);
        }
    }

    //------------------------------------
    // Template methods
    //-----------------------------------
    protected abstract doInitAsync(): Promise<void>;

    protected abstract doLogoutAsync(): Promise<void>;

    protected abstract getTokensAsync(useCache: boolean): Promise<TokenPair>;

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
        const {idToken, accessToken} = await this.getTokensAsync(useCache);

        // Load the token and its expiry. (We store the expiry to avoid frequent decoding.)
        runInAction(() => {
            this.idInfo = {token: idToken, expiry: jwtDecode(idToken).exp * SECONDS};
            this.accessInfo = {token: accessToken, expiry: jwtDecode(accessToken).exp * SECONDS};
        });

        this.logDebug(
            'Loaded tokens',
            new Date(this.idInfo.expiry),
            new Date(this.accessInfo.expiry)
        );
    }

    private async onTimerAsync(): Promise<void> {
        const {idInfo, accessInfo, config, lastRefreshAttempt, TIMER_INTERVAL} = this,
            threshold = config.tokenRefreshThresholdMins * MINUTES,
            checkInterval = config.tokenRefreshCheckSecs * SECONDS,
            idExpiry = idInfo?.expiry,
            accessExpiry = accessInfo?.expiry;

        // 1) Periodically Refresh if we are missing a token, or a token is too close to expiry
        if (
            olderThan(lastRefreshAttempt, checkInterval) &&
            (olderThan(idExpiry, -threshold) || olderThan(accessExpiry, -threshold))
        ) {
            try {
                this.lastRefreshAttempt = Date.now();
                await this.loadTokensAsync(false);
            } catch (e) {
                XH.handleException(e, {showAlert: false, logOnServer: false});
            }
        } else {
            // 2) Otherwise, if a token will expire before next check, clear it out
            const idExpires = idExpiry && olderThan(idExpiry, -TIMER_INTERVAL),
                accessExpires = accessExpiry && olderThan(accessExpiry, -TIMER_INTERVAL);
            if (idExpires || accessExpires) {
                runInAction(() => {
                    if (idExpires) this.idInfo = null;
                    if (accessExpires) this.accessInfo = null;
                });
            }
        }
        // 3) Always update the warning state.
        this.updateWarning();
    }

    private updateWarning() {
        const {expiryWarning} = this.config;
        if (!expiryWarning) return;

        const expired = !this.idToken || !this.accessToken;
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

export interface TokenPair {
    idToken: string;
    accessToken: string;
}

export interface TokenInfo {
    token: string;
    expiry: number;
}
