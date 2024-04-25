/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import * as msal from '@azure/msal-browser';
import {AuthenticationResult, IPublicClientApplication} from '@azure/msal-browser';
import {LogLevel} from '@azure/msal-common/src/logger/Logger';
import {HoistService, XH} from '@xh/hoist/core';
import {never} from '@xh/hoist/promise';
import {logWithDebug} from '@xh/hoist/utils/js';
import {isEmpty, isString} from 'lodash';

/**
 * Service to manage OAuth authentication via Azure Active Directory.
 * Use in conjunction with customizations in your app's AppModel.ts and in the app's server-side
 * with AuthenticationService.groovy and OauthService.groovy.
 */

interface OauthConfig {
    /** Hoist: Is OAuth enabled in this application? */
    enabled: boolean;

    /** Hoist: Is testing via test runner allowed */
    autoTestAllowed?: boolean;

    /** Client ID (GUID) of your app registered with the Azure Application registration portal */
    clientId: string;

    /** Tenant ID (GUID) of your organization */
    tenantId: string;

    /** You can use a specific authority,
     * like "https://login.microsoftonline.com/[tenantId]".
     * Enterprise apps will most likely use a specific authority.
     * MSAL Browser Lib defaults authority to "https://login.microsoftonline.com/common"
     **/
    authority?: string;

    /**
     * The redirect URL where authentication responses can be received by your application.
     * It must exactly match one of the redirect URIs registered in the Azure portal, in the SPA section.
     */
    redirectUrl?: 'APP_BASE_URL' | string;

    /** The redirect URL where the window navigates after a successful logout. */
    postLogoutRedirectUrl?: 'APP_BASE_URL' | string;

    /** The method used for logging in. Default is 'POPUP' on desktop and 'REDIRECT' on mobile. */
    loginMethod?: 'REDIRECT' | 'POPUP';

    /** The log level of MSAL. Default is LogLevel.Info (2). */
    msalLogLevel?: LogLevel;

    /**
     * Scopes for ID token.
     * Can be left unset if Oauth is used only for Authentication, just to get username and email.
     * These scopes appear to be granted by default:
     * ["user.read", "email", "profile", "openid"]
     **/
    idScopes?: string[];

    /**
     * Scopes for Access token.
     * Needed if Oauth is used for Authorization, to access other services.
     **/
    accessScopes?: string[];
}

/**
 * Uses MSAL to handle both silent and interactive user login.
 *
 * Supports an "autoTest" mode which uses an externally-provided accessToken for login in lieu of an interactive
 * MSAL-based flow. Designed for automated QA - see the README for additional details.
 */
export class AzureOauthService extends HoistService {
    static instance: AzureOauthService;

    /**
     * Is OAuth enabled in this application?  For bootstrapping, troubleshooting
     * and mobile development, we allow running in a non-SSO mode.
     */
    enabled: boolean;

    /** ID of the currently authenticated AD account. */
    accountId?: string;
    idToken?: string;
    accessToken: string;

    /** Instance of the Microsoft Authentication Library. */
    msalApp: IPublicClientApplication;

    /** True if autoTest mode both allowed and currently active. Set once on init. */
    isAutoTestMode: boolean = false;

    get account() {
        return this.msalApp?.getAccountByHomeId(this.accountId);
    }

    /**
     * True if an account has been selected and tokens loaded at least once
     *      during the lifetime of this service. Note that tokens might not be fresh - call
     *      `getTokenAsync()` to get a fully updated and ready to use set of tokens - but if this
     *      getter returns true we expect OAuth to generally be wired up and working.
     *
     *      Always returns true in autoTest mode as we do not have an account or an idToken and
     *      do not handle refreshing the accessToken.
     */
    get authInfoComplete(): boolean {
        return this.isAutoTestMode || !!(this.account && this.idToken && this.accessToken);
    }

    /** OAuth config as provided by server. */
    config: OauthConfig;

    get redirectUrl() {
        const url = this.config.redirectUrl ?? 'APP_BASE_URL';
        return url === 'APP_BASE_URL' ? `${window.location.origin}${this.redirectPath}` : url;
    }

    get postLogoutRedirectUrl() {
        const url = this.config.postLogoutRedirectUrl ?? 'APP_BASE_URL';
        return url === 'APP_BASE_URL' ? `${window.location.origin}${this.redirectPath}` : url;
    }

    // Default to redirect on mobile, popup on desktop.
    get useRedirect() {
        const {loginMethod} = this.config;
        if (loginMethod) {
            return loginMethod === 'REDIRECT';
        }

        return !XH.isDesktop;
    }

    get redirectPath() {
        return XH.isPhone ? '/mobile/' : '/app/';
    }

    redirectPending = false;

    _popupBlockerErrorTitle = 'Login popup window blocked';
    _defaultErrorMsg =
        'We are unable to authenticate you using Microsoft Azure Active Directory (OAuth) and your corporate account. Please ensure any pop-up windows or alternate browser tabs with this app open are fully closed, then refresh this tab in your browser to reload the application and try again.';

    //--------------------------------------------
    // State for tracking and navigation post-init
    //--------------------------------------------
    /** Duration in ms of login process. */
    loginDuration: number;
    /** True if there was an interactive async step during login. */
    wasInteractiveLogin: boolean = false;
    /**
     * App route present in URL prior to redirect, if any.
     * TODO - read this at an appropriate time in render/lifecycle after init - if non-null,
     *      we should validate and navigate to this route to land the user at the requested URL.
     *      Alternatively, see if built in MSAL navigateToLoginRequestUrl config works better.
     */
    pendingAppRoute: string;

    //------------------------
    // Public API
    //------------------------
    override async initAsync(): Promise<void> {
        const startTime = Date.now();

        try {
            //--------------------------
            // 1) Service + Config Setup
            //--------------------------
            this.logDebug('Initializing OauthService', window.location);
            const config = (this.config = (await XH.fetchJson({
                url: 'oauthConfig'
            })) as OauthConfig);
            this.logDebug('OAuth config fetched OK from server', config);

            this.enabled = config.enabled;
            if (!this.enabled) {
                XH.appSpec.isSSO = false;
                return;
            }

            //--------------------------
            // 1.5) Autotest Mode
            //--------------------------
            if (config.autoTestAllowed && window.sessionStorage.getItem('accessToken')) {
                this.logInfo('Autotest mode enabled');
                this.isAutoTestMode = true;
                await this.getTokenAsync();
                this.installDefaultFetchServiceHeaders();
                return;
            }

            this.msalApp = await msal.PublicClientApplication.createPublicClientApplication({
                auth: {
                    clientId: config.clientId,
                    authority: config.authority,
                    redirectUri: this.redirectUrl,
                    postLogoutRedirectUri: this.postLogoutRedirectUrl
                    // Possible alt. to capturing route via state - see pendingAppRoute above.
                    // navigateToLoginRequestUrl: true
                },
                system: {
                    loggerOptions: {
                        loggerCallback: this.logFromMsal,
                        logLevel: config.msalLogLevel ?? 1
                    }
                }
            });
            this.logDebug('MSAL instance created', 'setup complete', this.msalApp);

            //-------------------------------------
            // 2) Process or Kick-off Auth Routines
            //-------------------------------------
            const redirectResp = await this.msalApp.handleRedirectPromise(),
                accounts = this.msalApp.getAllAccounts();

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
                this.logInfo(`Redirect pending | will navigate away`);
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
                this.logInfo('Tokens acquired | ready to go!');
                this.installDefaultFetchServiceHeaders();
            } else if (!this.redirectPending) {
                this.logInfo(
                    `Incomplete tokens | no redirect pending - will fail | idToken: ${this.idToken} | accessToken: ${this.accessToken}`
                );
                throw new Error('Incomplete Tokens');
            } else {
                this.logInfo(
                    `Incomplete tokens | redirect pending - will navigate away | idToken: ${this.idToken} | accessToken: ${this.accessToken}`
                );
                await never();
            }
        } catch (e) {
            if (e.isServerUnavailable) throw e;

            throw XH.exception({
                name: e.name || 'Authentication Error',
                message:
                    e.message && e.message !== 'access_denied' ? e.message : this._defaultErrorMsg,
                details: e
            });
        } finally {
            this.loginDuration = Date.now() - startTime;
            this.logDebug(
                `OAuth service init complete`,
                `authInfoComplete: ${this.authInfoComplete}`
            );
        }
    }

    /** Request a full logout from MSAL, which will redirect away from this app to a configured URL. */
    async logoutAsync(): Promise<void> {
        const {account, postLogoutRedirectUrl} = this;
        this.logInfo(`Begin logoutAsync`, account);

        await this.msalApp?.logoutRedirect({
            // Ran into exception thrown when account specified - likely due to force clearing of
            // local storage in this.clearLocalMsalStorage(). Test again when removed.
            // account,
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
        const {msalApp, account, config, isAutoTestMode} = this;
        if (logTokens) this.logDebug(`getTokenAsync begin`, `isRetry: ${isRetry}`, account);

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
            ret = await msalApp.acquireTokenSilent({
                scopes: config.accessScopes,
                account
            });
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
                    this.logError('Login failed | no redirect pending | abort and throw');
                    throw e;
                }
            } else {
                this.logError('Unhandled getTokenAsync error | abort and throw', e);
                throw e;
            }
        }

        return ret;
    }

    //------------------------
    // Implementation
    //------------------------

    installDefaultFetchServiceHeaders() {
        this.logDebug('Calling installDefaultFetchServiceHeaders');
        XH.fetchService.setDefaultHeaders(opts => {
            const {idToken, accessToken} = this,
                relativeHoistUrl = !opts.url.startsWith('http');

            // Send XH ID token headers for requests to the Hoist server only - used to identify
            // our Hoist User via handling in server-side AuthenticationService.
            // This app's ApiService will handle installing a different Bearer token header
            // when calling the service API for business data.
            return relativeHoistUrl
                ? {
                      'x-xh-idt': idToken,
                      'x-xh-act': accessToken
                  }
                : {};
        });
    }

    @logWithDebug
    async loginAsync(): Promise<AuthenticationResult | null> {
        const {msalApp, useRedirect, config} = this;

        let ret = null;
        try {
            const scopes = [...(config.idScopes ?? []), ...(config.accessScopes ?? [])];

            if (useRedirect) {
                this.logDebug('Redirect login requested | calling MSAL...');
                this.redirectPending = true;
                await msalApp.loginRedirect({
                    scopes,
                    state: window.location.pathname
                });
            } else {
                this.logDebug('Popup login requested | calling MSAL...');
                this.wasInteractiveLogin = true;
                ret = await msalApp.loginPopup({scopes});
                this.idToken = ret.idToken;
            }
        } catch (e) {
            // Catch and rethrow exception indicating popup blocker with a more user-friendly error message.
            if (e.message.includes('popup window')) {
                throw XH.exception({
                    title: this._popupBlockerErrorTitle,
                    message:
                        'Unable to display the app login prompt in a popup window. Please check your browser for a blocked popup notification (typically within the URL bar). Allow all popups from this site, then refresh this page in your browser to try again.'
                });
            } else {
                this.logError('Unhandled loginAsync error | will return null', e);
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

    private logFromMsal(level, message) {
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
