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
    InteractionRequiredAuthError,
    IPublicClientApplication,
    LogLevel,
    SilentRequest
} from '@azure/msal-browser';
import {CommonAuthorizationUrlRequest} from '@azure/msal-common';
import {AppState, PlainObject, ReactionSpec, XH} from '@xh/hoist/core';
import {Token} from '@xh/hoist/security/Token';
import {logDebug, logError, logInfo, logWarn, mergeDeep, throwIf} from '@xh/hoist/utils/js';
import {withFormattedTimestamps} from '@xh/hoist/format';
import {flatMap, union, uniq} from 'lodash';
import {BaseOAuthClient, BaseOAuthClientConfig} from '../BaseOAuthClient';
import {AccessTokenSpec, TokenMap} from '../Types';

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
     * Captured performance events will be summarized as {@link MsalClientTelemetry}. Default true.
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

    /**
     * Enable the use of the MSAL ssoSilent() API, which will attempt to use credentials gained by
     * another app or tab to start a new session for this app.  Requires iFrames and 3rd party
     * cookies to be enabled.  Default true.
     *
     *  In practice, and according to documentation, this operation is likely to fail for a
     *  number of reasons, and can often do so as timeout.  Therefore, keeping the timeout limit
     *  value -- `system.iFrameHashTimeout` -- at a relatively low value is critical.  Hoist
     *  defaults this value to 3000ms vs. the default 10000ms.
     */
    enableSsoSilent?: boolean;

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
 * Important note: The handling of `ssoSilent` and `initRefreshTokenExpirationOffsetSecs` in this
 *    library require 3rd party cookies to be enabled in the browser so that MSAL can load contact
 *    in a hidden iFrame.
 */
export class MsalClient extends BaseOAuthClient<MsalClientConfig, MsalTokenSpec> {
    private client: IPublicClientApplication;
    private account: AccountInfo; // target account, may or may not be authenticated yet
    private initialTokenLoad: boolean;

    /** Enable telemetry via `enableTelemetry` ctor config, or via {@link enableTelemetry}. */
    telemetry: MsalClientTelemetry = null;
    private _telemetryCbHandle: string = null;

    constructor(config: MsalClientConfig) {
        super({
            initRefreshTokenExpirationOffsetSecs: -1,
            msalLogLevel: LogLevel.Warning,
            domainHint: null,
            enableTelemetry: true,
            enableSsoSilent: true,
            ...config
        });
    }

    //-------------------------------------------
    // Implementations of core lifecycle methods
    //-------------------------------------------
    protected override async doInitAsync(): Promise<TokenMap> {
        const client = (this.client = await this.createClientAsync()),
            {enableTelemetry, enableSsoSilent} = this.config;
        if (enableTelemetry) {
            this.enableTelemetry();
        }

        // 0) Handle redirect return
        const redirectResp = await client.handleRedirectPromise();
        if (redirectResp) {
            this.logDebug('Completing Redirect login');
            this.setAccount(redirectResp.account);
            this.restoreRedirectState(redirectResp.state);
            const ret = this.fetchAllTokensAsync({eagerOnly: true});
            this.noteAuthComplete('loginRedirect');
            return ret;
        }

        // 1) If we can identify the "selected" account, try to just reload tokens silently.
        // This is the happy path on recent refresh. This should never trigger popup/redirect, but if
        // 'initRefreshTokenExpirationOffsetSecs' is set, this may trigger a hidden iframe redirect
        // to gain a new refreshToken (3rd party cookies required).
        const accounts = client.getAllAccounts();
        this.logDebug('Accounts available', accounts);
        const account =
            accounts.length == 1
                ? accounts[0]
                : accounts.find(a => (a.username = this.getSelectedUsername()));
        if (account) {
            this.setAccount(account);
            try {
                this.initialTokenLoad = true;
                this.logDebug('Attempting silent token load.');
                const ret = await this.fetchAllTokensAsync({eagerOnly: true});
                this.noteAuthComplete('acquireSilent');
                return ret;
            } catch (e) {
                this.logDebug('Failed to load tokens on init, fall back to login', e.message ?? e);
            } finally {
                this.initialTokenLoad = false;
            }
        }

        // 2) Try `ssoSilent` API to potentially reuse logged-in user on other apps
        // in same domain without interaction.  This should never trigger popup/redirect, and will
        // use an iFrame (3rd party cookies required). Must fail gently.
        if (enableSsoSilent) {
            try {
                this.logDebug('Attempting SSO');
                await this.loginSsoAsync();
                const ret = await this.fetchAllTokensAsync({eagerOnly: true});
                this.noteAuthComplete('ssoSilent');
                return ret;
            } catch (e) {
                this.logDebug('SSO failed', e.message ?? e);
            }
        }

        // 3) If none of above succeeded, must do "interactive" login.  This may or may not require
        // user involvement but will require at least a redirect or cursory auto-closing popup.
        this.logDebug('Attempting Login');
        await this.loginAsync();
        return this.fetchAllTokensAsync({eagerOnly: true});
    }

    protected override async doLoginPopupAsync(): Promise<void> {
        try {
            const ret = await this.client.acquireTokenPopup(this.authRequestCore());
            this.setAccount(ret.account);
            this.noteAuthComplete('loginPopup');
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
        await this.client.acquireTokenRedirect({
            ...this.authRequestCore(),
            state: this.captureRedirectState(),
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
        const {client, account, loginMethod, postLogoutRedirectUrl} = this,
            isRedirect = loginMethod == 'REDIRECT',
            opts = {
                account,
                postLogoutRedirectUri: isRedirect ? postLogoutRedirectUrl : this.blankUrl,
                mainWindowRedirectUri: isRedirect ? undefined : postLogoutRedirectUrl
            };

        isRedirect ? await client.logoutRedirect(opts) : await client.logoutPopup(opts);
    }

    protected override interactiveLoginNeeded(exception: unknown): boolean {
        return exception instanceof InteractionRequiredAuthError;
    }

    //------------------------
    // Telemetry
    //------------------------
    getFormattedTelemetry(): PlainObject {
        return withFormattedTimestamps(this.telemetry);
    }

    enableTelemetry(): void {
        if (this._telemetryCbHandle) {
            this.logInfo('Telemetry already enabled', this.getFormattedTelemetry());
            return;
        }

        this.telemetry = {
            authMethod: null,
            summary: {
                successCount: 0,
                failureCount: 0,
                maxDuration: 0,
                lastFailureTime: null
            },
            events: {}
        };

        this._telemetryCbHandle = this.client.addPerformanceCallback(events => {
            events.forEach(e => {
                try {
                    const {summary, events} = this.telemetry,
                        {name, startTimeMs, durationMs, success, errorName, errorCode} = e,
                        eTime = startTimeMs ?? Date.now();

                    const eResult: PlainObject = (events[name] ??= {
                        firstTime: eTime,
                        lastTime: eTime,
                        successCount: 0,
                        failureCount: 0
                    });
                    eResult.lastTime = eTime;

                    if (success) {
                        summary.successCount++;
                        eResult.successCount++;
                    } else {
                        summary.failureCount++;
                        summary.lastFailureTime = eTime;
                        eResult.failureCount++;
                        eResult.lastFailure = {
                            time: eTime,
                            duration: e.durationMs,
                            code: errorCode,
                            name: errorName
                        };
                    }

                    if (durationMs) {
                        const duration = (eResult.duration ??= {
                            count: 0,
                            total: 0,
                            average: 0,
                            max: 0
                        });
                        duration.count++;
                        duration.total += durationMs;
                        duration.average = Math.round(duration.total / duration.count);
                        duration.max = Math.max(duration.max, durationMs);
                        summary.maxDuration = Math.max(summary.maxDuration, durationMs);
                    }
                } catch (e) {
                    this.logError(`Error processing telemetry event`, e);
                }
            });
        });

        // Wait for clientHealthService (this client likely initialized during earlier AUTHENTICATING.)
        this.addReaction({
            when: () => XH.appState === AppState.INITIALIZING_APP,
            run: () => XH.clientHealthService.addSource('msalClient', () => this.telemetry)
        } as ReactionSpec);

        this.logDebug('Telemetry enabled');
    }

    disableTelemetry(): void {
        if (!this._telemetryCbHandle) {
            this.logInfo('Telemetry already disabled');
            return;
        }

        this.client.removePerformanceCallback(this._telemetryCbHandle);
        this._telemetryCbHandle = null;

        XH.clientHealthService.removeSource('msalClient');
        this.logInfo('Telemetry disabled', this.getFormattedTelemetry());
    }

    //------------------------
    // Private implementation
    //------------------------
    private async loginSsoAsync(): Promise<void> {
        const result = await this.client.ssoSilent(this.authRequestCore());
        this.setAccount(result.account);
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
                    },
                    iFrameHashTimeout: 3000 // Prevent long pauses for sso failures.
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
        const source = this.client.constructor.name;
        switch (level) {
            case msal.LogLevel.Info:
                return logInfo(message, source);
            case msal.LogLevel.Warning:
                return logWarn(message, source);
            case msal.LogLevel.Error:
                return logError(message, source);
            default:
                return logDebug(message, source);
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

    private setAccount(account: AccountInfo) {
        this.account = account;
        this.setSelectedUsername(account.username);
        this.logDebug('Target account identified:', account.username);
    }

    private noteAuthComplete(authMethod: AuthMethod) {
        if (this.telemetry) this.telemetry.authMethod = authMethod;
        this.logInfo(`Authenticated user ${this.account.username} via ${authMethod}`);
    }

    private authRequestCore(): AuthRequestCore {
        const ret: AuthRequestCore = {
            domainHint: this.config.domainHint,
            scopes: this.loginScopes,
            extraScopesToConsent: this.loginExtraScopesToConsent,
            redirectUri: this.blankUrl
        };

        // Only send these critical hints if we have them.  Prioritize account, as that has
        // more info, and MSAL source appears to let loginHint override that.
        if (this.account) {
            ret.account = this.account;
        } else if (this.getSelectedUsername()) {
            ret.loginHint = this.getSelectedUsername();
        }
        return ret;
    }
}

type AuthRequestCore = Pick<
    CommonAuthorizationUrlRequest,
    'domainHint' | 'scopes' | 'extraScopesToConsent' | 'account' | 'loginHint' | 'redirectUri'
>;
type AuthMethod = 'acquireSilent' | 'ssoSilent' | 'loginPopup' | 'loginRedirect';

/**
 * Telemetry produced by this client (if enabled) + included in {@link ClientHealthService}
 * reporting. Leverages MSAL's opt-in support for emitting performance events.
 * See https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/performance.md
 */
interface MsalClientTelemetry {
    /** Method of last authentication for this client. */
    authMethod: AuthMethod;

    /** Stats across all events */
    summary: {
        successCount: number;
        failureCount: number;
        maxDuration: number;
        lastFailureTime: number;
    };
    /** Stats by event type */
    events: Record<string, MsalEventTelemetry>;
}

/** Aggregated telemetry results for a single type of event. */
interface MsalEventTelemetry {
    firstTime: number;
    lastTime: number;
    successCount: number;
    failureCount: number;
    /** Timing info (in ms) for event instances reported with duration. */
    duration?: {
        count: number;
        total: number;
        average: number;
        max: number;
    };
    lastFailure?: {
        time: number;
        duration: number;
        code: string;
        name: string;
    };
}
