/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import * as msal from '@azure/msal-browser';
import {AuthenticationResult, IPublicClientApplication} from '@azure/msal-browser';
import {LogLevel} from '@azure/msal-common/src/logger/Logger';
import {PlainObject, XH} from '@xh/hoist/core';
import {never} from '@xh/hoist/promise';
import {FetchOptions} from '@xh/hoist/svc';
import {isEmpty, isString} from 'lodash';
import {BaseOauthConfig, BaseOauthService} from '../BaseOauthService';

interface AzureOauthConfig extends BaseOauthConfig {
    /** Is testing via test runner allowed */
    autoTestAllowed?: boolean;

    /** Tenant ID (GUID) of your organization */
    tenantId: string;

    /**
     * You can use a specific authority, like "https://login.microsoftonline.com/[tenantId]".
     * Enterprise apps will most likely use a specific authority.
     * MSAL Browser Lib defaults authority to "https://login.microsoftonline.com/common"
     */
    authority?: string;

    /** The log level of MSAL. Default is LogLevel.Info (2). */
    msalLogLevel?: LogLevel;

    /**
     * Scopes for Access token.
     * Needed if Oauth is used for Authorization, to access other services.
     */
    accessScopes?: string[];
}

/**
 * Service to implement OAuth authentication via Azure Active Directory/MSAL.
 *
 * Azure grants these scopes by default if idScopes are not set:
 * user.read, email, profile, openid
 *
 * Supports an "autoTest" mode which uses an externally-provided accessToken for login in lieu of
 * an interactive MSAL-based flow. Designed for automated QA .
 */
export class AzureOauthService extends BaseOauthService {
    static instance: AzureOauthService;

    private msalApp: IPublicClientApplication;

    private accountId?: string; // ID of the currently authenticated AD account.
    private accessToken: string;
    private isAutoTestMode: boolean = false;
    private redirectPending = false;
    private accessScopes: string[];

    /**
     * App route present in URL prior to redirect, if any.
     */
    private pendingAppRoute: string;

    get account() {
        return this.msalApp?.getAccountByHomeId(this.accountId);
    }

    /**
     * True if an account has been selected and tokens loaded at least once
     * during the lifetime of this service. Note that tokens might not be fresh - call
     * `getTokenAsync()` to get a fully updated and ready to use set of tokens - but if this
     *  getter returns true we expect OAuth to generally be wired up and working.
     *
     * Always returns true in autoTest mode as we do not have an account or an idToken and
     * do not handle refreshing the accessToken.
     */
    get authInfoComplete(): boolean {
        return this.isAutoTestMode || !!(this.account && this.idToken && this.accessToken);
    }

    override defaultErrorMsg =
        'We are unable to authenticate you using Microsoft Azure Active Directory (OAuth) and your corporate account. Please ensure any pop-up windows or alternate browser tabs with this app open are fully closed, then refresh this tab in your browser to reload the application and try again.';

    override async doInitAsync(): Promise<void> {
        const config = this.config as AzureOauthConfig,
            {
                autoTestAllowed,
                clientId,
                authority,
                redirectUrl,
                postLogoutRedirectUrl,
                msalLogLevel,
                accessScopes
            } = config;

        this.accessScopes = accessScopes;

        try {
            //--------------------------
            // 0) Autotest Mode
            //--------------------------
            if (autoTestAllowed && window.sessionStorage.getItem('accessToken')) {
                this.logInfo('Autotest mode enabled');
                this.isAutoTestMode = true;
                await this.getTokenAsync();
                return;
            }

            //-------------------
            // 1) Create msalApp
            //-----------------
            const msalApp = (this.msalApp =
                await msal.PublicClientApplication.createPublicClientApplication({
                    auth: {
                        clientId,
                        authority,
                        redirectUri: redirectUrl,
                        postLogoutRedirectUri: postLogoutRedirectUrl
                        // navigateToLoginRequestUrl: true // alt. to pendingAppRoute above?
                    },
                    system: {
                        loggerOptions: {
                            loggerCallback: this.logFromMsal,
                            logLevel: msalLogLevel ?? 1
                        }
                    }
                }));
            this.logDebug('MSAL instance created', 'setup complete', msalApp);

            //-------------------------------------
            // 2) Process or Kick-off Auth Routines
            //-------------------------------------
            const redirectResp = await msalApp.handleRedirectPromise(),
                accounts = msalApp.getAllAccounts();

            if (redirectResp) {
                // Case (A) - handling callback after redirect. Expecting account and idToken on
                // successful response. Response contains an accessToken but not one that is usable
                // for our purposes - we need to request that separately.
                // TODO - look for redirectResp.state - this would be a path to an app route.
                this.logDebug(`Processing redirect response received from MSAL`, redirectResp);
                this.accountId = redirectResp.account?.homeAccountId;
                this.idToken = redirectResp.idToken;
                this.pendingAppRoute = this.parsePendingRoute(redirectResp.state);
            } else if (!isEmpty(accounts)) {
                // Case (B) - coming in fresh, account located by MSAL from cached session.
                // Expecting accountId only - no valid/fresh idToken assumed to be available.
                // TODO - find out in practice if a user can get into a state where there are
                //      multiple accounts available here... If common we will likely want to
                //      improve that workflow (e.g. set one as default to always use.)
                //      If so, see if the `prompt.select_account` config within msal.RedirectRequest
                //      might serve our needs better here.
                this.logDebug(`Found ${accounts.length} accounts`, accounts);
                const acctId = accounts[0].homeAccountId;

                this.logDebug(`User account selection`, `selected ${acctId}`, accounts);
                this.accountId = acctId || null;

                if (!acctId) {
                    // User does not want to use any already available accounts.
                    // Request MSAL logout - will set redirectPending.
                    await this.logoutAsync();
                    this.logDebug(
                        'User account selection',
                        'no account selected',
                        'logout requested'
                    );
                }
            }

            if (!this.accountId && !this.redirectPending) {
                // Case (C) - coming in fresh, no account found in session - need to login.
                //            Redirect flow -> null loginResp, will redirect.
                //            Popup flow -> loginResp provides account and idToken if OK.
                const loginResp = await this.loginAsync();
                this.accountId = loginResp?.account?.homeAccountId;
                this.idToken = loginResp?.idToken;
            }

            //---------------------------------------------------------
            // 3) Post-account selection processing / token acquisition
            //---------------------------------------------------------
            this.logInfo(`Initial account selection / login complete`, {
                accountId: this.accountId,
                idToken: this.idToken
            });

            // Case (A) - redirect pending - nothing else we want to do here in this service.
            // Await forever to keep mask on app and prevent init from proceeding.
            if (this.redirectPending) {
                this.logInfo(`Redirect pending', 'will navigate away`);
                return await never();
            }

            // Case (B) - dead-end if we don't have an accountId and aren't pending a redirect...
            // Require reload
            if (!this.accountId) {
                throw XH.exception({
                    message: `Unable to authenticate via Active Directory (no accountId set) and no auth redirect is pending.`,
                    requireReload: true
                });
            }

            // Case (C) - expected workflow - account identified and should be usable, request
            // ID and Access tokens via silent call - should install ready-to-use tokens.
            this.logDebug('Calling getTokenAsync() to install ID and Access tokens');
            const getTokenResp = await this.getTokenAsync(false, true);
            this.logDebug(`getTokenAsync() complete`, getTokenResp);

            // TODO - is there any chance we have a STALE idToken at this point?
            //      We would hit that case with MSALv1 and had some special handling to check.
            if (this.idToken && this.accessToken) {
                this.logInfo('Tokens acquired, ready to go!');
            } else if (!this.redirectPending) {
                this.logInfo('Incomplete tokens', 'no redirect pending - will fail', {
                    idToken: this.idToken,
                    accessToken: this.accessToken
                });
                throw XH.exception('Incomplete Tokens');
            } else {
                this.logInfo('Incomplete tokens', 'redirect pending - will navigate away', {
                    idToken: this.idToken,
                    accessToken: this.accessToken
                });
                await never();
            }
        } catch (e) {
            if (e.isServerUnavailable) throw e;

            throw XH.exception({
                name: e.name || 'Authentication Error',
                message:
                    e.message && e.message !== 'access_denied' ? e.message : this.defaultErrorMsg,
                details: e
            });
        } finally {
            this.logDebug(`OAuth service init complete`, {authInfoComplete: this.authInfoComplete});
        }
    }

    override async doLogoutAsync(): Promise<void> {
        const {postLogoutRedirectUrl, msalApp} = this;

        await msalApp?.logoutRedirect({
            // Ran into exception thrown when 'account' specified - likely due to force clearing of
            // local storage in this.clearLocalMsalStorage(). Test again when removed.
            postLogoutRedirectUri: postLogoutRedirectUrl
        });

        this.redirectPending = true;
    }

    /**
     * Request and refresh tokens (both ID and Access) from MSAL via silent request. Expected to be
     * called often during course of normal operation both on initial login (where tokens will
     * likely be requested and issued from AD) and frequently from apiService (where tokens should
     * be fetched from local cache).
     *
     * If successful response includes tokens of either type they will be set into the appropriate
     * properties on this service as a side effect of this call.
     *
     * When in autoTest mode, we expect the idToken to be null and for the accessToken to be handled
     * externally (i.e. by Cypress) and to be present in the sessionStorage under the 'accessToken'
     * key. We do not utilize MSAL or refresh the token ourselves in this mode.
     */
    async getTokenAsync(
        isRetry: boolean = false,
        logTokens: boolean = false
    ): Promise<AuthenticationResult | {accessToken: string}> {
        const {msalApp, account, isAutoTestMode} = this;
        if (logTokens) this.logDebug(`getTokenAsync begin`, {isRetry, account});

        if (isAutoTestMode) {
            // The key 'accessToken' in sessionStorage is the location in which the autoTest team
            // puts the accessToken for testing their other app, as confirmed in Dec-2-2022 teams chat.
            const autoTestAccessToken = window.sessionStorage.getItem('accessToken');
            if (autoTestAccessToken) {
                this.accessToken = autoTestAccessToken;
            }
            return {accessToken: this.accessToken};
        }

        let ret = null;
        try {
            ret = await msalApp.acquireTokenSilent({scopes: this.accessScopes, account});
            if (ret.accessToken) {
                this.accessToken = ret.accessToken;
                if (logTokens) {
                    this.logDebug(`Access token acquired and updated`, {
                        accessToken: ret.accessToken
                    });
                }
            }
            if (ret.idToken) {
                this.idToken = ret.idToken;
                if (logTokens) {
                    this.logDebug(`ID token acquired and updated`, {
                        idToken: ret.idToken
                    });
                }
            }
        } catch (e) {
            if (isRetry) {
                this.logError('getTokenAsync failure on retry - abort and throw');
                throw e;
            }

            if (e instanceof msal.InteractionRequiredAuthError || e instanceof msal.AuthError) {
                this.logInfo('getTokenAsync auth required error', 'will await login', e);
                const loginResult = await this.loginAsync();

                if (loginResult) {
                    this.logDebug('Login success | will retry getTokenAsync()');
                    ret = await this.getTokenAsync(true, true);
                } else if (this.redirectPending) {
                    this.logDebug(`Redirect pending | will navigate away`);
                    return never();
                } else {
                    this.logError('Login failed', 'no redirect pending', 'abort and throw');
                    throw e;
                }
            } else {
                this.logError('Unhandled getTokenAsync error', 'abort and throw', e);
                throw e;
            }
        }

        return ret;
    }

    protected override getDefaultHeaders(opts: FetchOptions): PlainObject {
        const sup = super.getDefaultHeaders(opts),
            {accessToken} = this;
        return accessToken ? {...sup, 'x-xh-act': accessToken} : sup;
    }

    //------------------------
    // Implementation
    //------------------------
    private async loginAsync(): Promise<AuthenticationResult> {
        const {msalApp, useRedirect, config} = this;

        let ret = null;
        try {
            const scopes = [...(config.idScopes ?? []), ...(this.accessScopes ?? [])];

            if (useRedirect) {
                this.logDebug('Redirect login requested | calling MSAL...');
                this.redirectPending = true;
                await msalApp.loginRedirect({scopes, state: window.location.pathname});
            } else {
                this.logDebug('Popup login requested', 'Calling MSAL...');
                ret = await msalApp.loginPopup({scopes});
                this.idToken = ret.idToken;
            }
        } catch (e) {
            // Catch and rethrow exception indicating popup blocker with a more user-friendly error message.
            if (e.message.includes('popup window')) {
                throw XH.exception({
                    name: 'Azure Oauth Login Error',
                    message: this.popupBlockerErrorMessage,
                    cause: e
                });
            } else {
                this.logError('Unhandled loginAsync error', 'will return null', e);
            }
        }

        return ret;
    }

    // Examines a pre-redirect URL round-tripped through MSAL to see if there is a route to save.
    // If any route, should be of the form '/app/foo/bar/' - we want to return 'foo.bar'.
    private parsePendingRoute(state) {
        const basePath = `/${XH.clientAppCode}/`;
        if (!isString(state) || !state.startsWith(basePath)) return null;

        const routePath = state.replace(basePath, '');
        return 'default.' + routePath.split('/').join('.');
    }

    private logFromMsal(level: LogLevel, message: string) {
        message = `[MSAL] ${message}`;
        switch (level) {
            case msal.LogLevel.Info:
                console.info(message);
                break;
            case msal.LogLevel.Warning:
                console.warn(message);
                break;
            case msal.LogLevel.Error:
                console.error(message);
                break;
            default:
                console.debug(message);
        }
    }
}
