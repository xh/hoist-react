/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import * as msal from '@azure/msal-browser';
import {
    AccountInfo,
    BrowserPerformanceClient,
    Configuration,
    IPublicClientApplication,
    LogLevel,
    PopupRequest,
    SilentRequest
} from '@azure/msal-browser';
import {XH} from '@xh/hoist/core';
import {Token} from '@xh/hoist/security/Token';
import {AccessTokenSpec, TokenMap} from '../Types';
import {logDebug, logError, logInfo, logWarn, mergeDeep, throwIf} from '@xh/hoist/utils/js';
import {flatMap, union, uniq} from 'lodash';
import {BaseOAuthClient, BaseOAuthClientConfig} from '../BaseOAuthClient';

export interface MsalClientConfig extends BaseOAuthClientConfig<MsalTokenSpec> {
    /**
     * Authority for your organization's tenant: `https://login.microsoftonline.com/[tenantId]`.
     * MSAL defaults to their "common" tenant (https://login.microsoftonline.com/common") to support
     * auth with personal MS accounts, but enterprise/Hoist apps will almost certainly use a
     * specific authority to point to their own private/corporate tenant.
     */
    authority: string;

    /**
     * A hint about the tenant or domain that the user should use to sign in.
     * The value of the domain hint is a registered domain for the tenant.
     */
    domainHint?: string;

    /**
     * True to enable support for built-in telemetry provided by this class's internal MSAL client.
     * See https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/performance.md
     */
    enableTelemetry?: boolean;

    /**
     * If specified, the client will use this value when initializing the app to enforce a minimum
     * amount of time during which no further auth flow with the provider should be necessary.
     *
     * Use this argument to front-load any necessary auth flow to the apps initialization stage
     * thereby minimizing disruption to user activity during application use.
     *
     * This value may be set to anything up to 86400 (24 hours), the maximum lifetime
     * of an Azure refresh token.  Set to -1 to disable (default).
     *
     * Note that setting to *any* non-disabled amount will require the app to do *some* communication
     * with the login provider at *every* app load. This may just involve loading new tokens via
     * fetch, however, setting to higher values will increase the frequency with which
     * a new refresh token will also need to be requested via a hidden iframe/redirect/popup. This
     * can be time-consuming and potentially disruptive and applications should therefore use with
     * care and typically set to some value significantly less than the max.
     *
     * See https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/token-lifetimes.md
     */
    initRefreshTokenExpirationOffsetSecs?: number;

    /** The log level of MSAL. Default is LogLevel.Warning. */
    msalLogLevel?: LogLevel;

    /**
     * Additional options for the MSAL client ctor. Will be deep merged with defaults, with options
     * supplied here taking precedence. Use with care, as overriding defaults may have unintended
     * consequences or fail to work with Hoist's expected usage of the client library.
     */
    msalClientOptions?: Partial<msal.Configuration>;
}

export interface MsalTokenSpec extends AccessTokenSpec {
    /**
     * Scopes to be added to the scopes requested during interactive and SSO logins.
     * See the `scopes` property on  `PopupRequest`, `RedirectRequest`, and `SSORequest`
     * for more info.
     */
    loginScopes?: string[];

    /**
     * Scopes to be added to the scopes requested during interactive and SSO login.
     *
     * See the `extraScopesToConsent` property on  `PopupRequest`, `RedirectRequest`, and
     * `SSORequest` for more info.
     */
    extraScopesToConsent?: string[];
}

/**
 * Service to implement OAuth authentication via MSAL.
 *
 * See the following helpful information relevant to our use of this tricky API --
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/token-lifetimes.md
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/login-user.md
 *
 * Also see this doc re. use of blankUrl as redirectUri for all "silent" token requests:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/errors.md#issues-caused-by-the-redirecturi-page
 *
 * TODO: The handling of `ssoSilent` and `initRefreshTokenExpirationOffsetSecs` in this library
 *   require 3rd party cookies to be enabled in the browser so that MSAL can load contact in a
 *   hidden iFrame  If its *not* enabled, we may be doing extra work.  Consider checking 3rd party
 *   cookie support and adding conditional behavior?
 */
export class MsalClient extends BaseOAuthClient<MsalClientConfig, MsalTokenSpec> {
    private client: IPublicClientApplication;
    private account: AccountInfo; // Authenticated account
    private initialTokenLoad: boolean;

    constructor(config: MsalClientConfig) {
        super({
            initRefreshTokenExpirationOffsetSecs: -1,
            msalLogLevel: LogLevel.Warning,
            domainHint: null,
            ...config
        });
    }

    //-------------------------------------------
    // Implementations of core lifecycle methods
    //-------------------------------------------
    protected override async doInitAsync(): Promise<TokenMap> {
        const client = (this.client = await this.createClientAsync());

        // 0) Handle redirect return
        const redirectResp = await client.handleRedirectPromise();
        if (redirectResp) {
            this.logDebug('Completing Redirect login');
            this.noteUserAuthenticated(redirectResp.account);
            this.restoreRedirectState(redirectResp.state);
            return this.fetchAllTokensAsync({eagerOnly: true});
        }

        // 1) If we are logged in, try to just reload tokens silently.  This is the happy path on
        // recent refresh. This should never trigger popup/redirect, but if
        // 'initRefreshTokenExpirationOffsetSecs' is set, this may trigger a hidden iframe redirect
        // to gain a new refreshToken (3rd party cookies required).
        const accounts = client.getAllAccounts();
        this.logDebug('Authenticated accounts available', accounts);
        const account = accounts.length == 1 ? accounts[0] : null;
        if (account) {
            this.noteUserAuthenticated(account);
            try {
                this.initialTokenLoad = true;
                this.logDebug('Attempting silent token load.');
                return await this.fetchAllTokensAsync({eagerOnly: true});
            } catch (e) {
                this.account = null;
                this.logDebug('Failed to load tokens on init, fall back to login', e.message ?? e);
            } finally {
                this.initialTokenLoad = false;
            }
        }

        // 2) Otherwise need to login.
        // 2a) Try MSALs `ssoSilent` API, to potentially reuse logged-in user on other apps in same
        // domain without interaction.  This should never trigger popup/redirect, but will use an iFrame
        // if available (3rd party cookies required).  Will work if MSAL can resolve a single
        // logged-in user with access to app and meeting all hint criteria.
        try {
            this.logDebug('Attempting SSO');
            await this.loginSsoAsync();
        } catch (e) {
            this.logDebug('SSO failed', e.message ?? e);
        }

        // 2b) Otherwise do full interactive login.  This may or may not require user involvement
        // but will require at the very least a redirect or cursory auto-closing popup.
        if (!this.account) {
            this.logDebug('Logging in');
            await this.loginAsync();
        }

        // 3) Return tokens
        return this.fetchAllTokensAsync({eagerOnly: true});
    }

    protected override async doLoginPopupAsync(): Promise<void> {
        const {client} = this,
            opts: PopupRequest = {
                loginHint: this.getSelectedUsername(),
                domainHint: this.config.domainHint,
                scopes: this.loginScopes,
                extraScopesToConsent: this.loginExtraScopesToConsent,
                redirectUri: this.blankUrl
            };
        try {
            const ret = await client.acquireTokenPopup(opts);
            this.noteUserAuthenticated(ret.account);
        } catch (e) {
            if (e.message?.toLowerCase().includes('popup window')) {
                throw XH.exception({
                    name: 'Azure Login Error',
                    message: this.popupBlockerErrorMessage,
                    cause: e
                });
            }
            throw e;
        }
    }

    protected override async doLoginRedirectAsync(): Promise<void> {
        const state = this.captureRedirectState();

        await this.client.acquireTokenRedirect({
            state,
            loginHint: this.getSelectedUsername(),
            domainHint: this.config.domainHint,
            scopes: this.loginScopes,
            extraScopesToConsent: this.loginExtraScopesToConsent,
            redirectUri: this.redirectUrl
        });

        await this.maskAfterRedirectAsync();
    }

    protected override async fetchIdTokenAsync(useCache: boolean = true): Promise<Token> {
        const ret = await this.client.acquireTokenSilent({
            account: this.account,
            scopes: this.idScopes,
            forceRefresh: !useCache,
            prompt: 'none',
            redirectUri: this.blankUrl,
            ...this.refreshOffsetArgs
        });
        return new Token(ret.idToken);
    }

    protected override async fetchAccessTokenAsync(
        spec: MsalTokenSpec,
        useCache: boolean = true
    ): Promise<Token> {
        const ret = await this.client.acquireTokenSilent({
            account: this.account,
            scopes: spec.scopes,
            forceRefresh: !useCache,
            prompt: 'none',
            redirectUri: this.blankUrl,
            ...this.refreshOffsetArgs
        });
        return new Token(ret.accessToken);
    }

    protected override async doLogoutAsync(): Promise<void> {
        const {postLogoutRedirectUrl, client, account, loginMethod} = this,
            opts = {account, postLogoutRedirectUri: postLogoutRedirectUrl};

        loginMethod == 'REDIRECT'
            ? await client.logoutRedirect(opts)
            : await client.logoutPopup(opts);
    }

    //------------------------
    // Private implementation
    //------------------------
    private async loginSsoAsync(): Promise<void> {
        const result = await this.client.ssoSilent({
            loginHint: this.getSelectedUsername(),
            domainHint: this.config.domainHint,
            redirectUri: this.blankUrl,
            scopes: this.loginScopes,
            extraScopesToConsent: this.loginExtraScopesToConsent,
            prompt: 'none'
        });
        this.noteUserAuthenticated(result.account);
    }

    private async createClientAsync(): Promise<IPublicClientApplication> {
        const {clientId, authority, msalLogLevel, msalClientOptions, enableTelemetry} = this.config;
        throwIf(!authority, 'Missing MSAL authority. Please review your configuration.');

        const mergedConf: Configuration = mergeDeep(
            {
                auth: {
                    clientId,
                    authority,
                    postLogoutRedirectUri: this.postLogoutRedirectUrl
                },
                system: {
                    loggerOptions: {
                        loggerCallback: this.logFromMsal,
                        logLevel: msalLogLevel
                    }
                },
                cache: {
                    cacheLocation: 'localStorage' // allows sharing auth info across tabs.
                }
            },
            msalClientOptions
        );

        return msal.PublicClientApplication.createPublicClientApplication(
            enableTelemetry
                ? {
                      ...mergedConf,
                      telemetry: {
                          client: new BrowserPerformanceClient(mergedConf)
                      }
                  }
                : mergedConf
        );
    }

    private logFromMsal(level: LogLevel, message: string) {
        const {client} = this;
        switch (level) {
            case msal.LogLevel.Info:
                return logInfo(message, client);
            case msal.LogLevel.Warning:
                return logWarn(message, client);
            case msal.LogLevel.Error:
                return logError(message, client);
            default:
                return logDebug(message, client);
        }
    }

    private get loginScopes(): string[] {
        return uniq(
            union(
                this.idScopes,
                flatMap(this.config.accessTokens, spec => spec.loginScopes ?? [])
            )
        );
    }

    private get loginExtraScopesToConsent(): string[] {
        return uniq(flatMap(this.config.accessTokens, spec => spec.extraScopesToConsent ?? []));
    }

    private get refreshOffsetArgs(): Partial<SilentRequest> {
        const offset = this.config.initRefreshTokenExpirationOffsetSecs;
        return offset > 0 && this.initialTokenLoad
            ? {forceRefresh: true, refreshTokenExpirationOffsetSeconds: offset}
            : {};
    }

    private noteUserAuthenticated(account: AccountInfo) {
        this.account = account;
        this.setSelectedUsername(account.username);
        this.logDebug('User Authenticated', account.username);
    }
}
