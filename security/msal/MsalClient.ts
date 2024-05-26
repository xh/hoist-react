/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import * as msal from '@azure/msal-browser';
import {
    AccountInfo,
    IPublicClientApplication,
    LogLevel,
    PopupRequest,
    RedirectRequest,
    SilentRequest
} from '@azure/msal-browser';
import {XH} from '@xh/hoist/core';
import {never} from '@xh/hoist/promise';
import {Token, TokenMap} from '@xh/hoist/security/Token';
import {logDebug, logError, logInfo, logWarn, throwIf} from '@xh/hoist/utils/js';
import {flatMap, union, uniq} from 'lodash';
import {BaseOAuthClient, BaseOAuthClientConfig} from '../BaseOAuthClient';

export interface MsalClientConfig extends BaseOAuthClientConfig<MsalTokenSpec> {
    /** Tenant ID (GUID) of your organization */
    tenantId: string;

    /**
     * You can use a specific authority, like "https://login.microsoftonline.com/[tenantId]".
     * Enterprise apps will most likely use a specific authority.
     * MSAL Browser Lib defaults authority to "https://login.microsoftonline.com/common"
     */
    authority?: string;

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
}

export interface MsalTokenSpec {
    /** Scopes for the desired access token. */
    scopes: string[];
}

/**
 * Service to implement OAuth authentication via MSAL.
 */
export class MsalClient extends BaseOAuthClient<MsalClientConfig, MsalTokenSpec> {
    private client: IPublicClientApplication;
    private account: AccountInfo; // Authenticated account, as most recent auth call with Azure.
    private initialTokenLoad: boolean;

    constructor(config: MsalClientConfig) {
        super({
            initRefreshTokenExpirationOffsetSecs: -1,
            msalLogLevel: LogLevel.Warning,
            ...config
        });
    }

    //-------------------------------------------
    // Implementations of core lifecycle methods
    //-------------------------------------------
    protected override async doInitAsync(): Promise<TokenMap> {
        const client = (this.client = await this.createClientAsync());

        // Try to optimistically load tokens silently
        try {
            this.initialTokenLoad = true;
            this.account = client.getAllAccounts()[0];
            if (this.account) {
                return await this.fetchAllTokensAsync();
            }
        } catch (e) {
            this.logDebug('Failed to load tokens on init, falling back on login', e);
        } finally {
            this.initialTokenLoad = false;
        }

        // ...otherwise login and *then* load tokens
        await this.loginAsync();
        this.logDebug(`(Re)authenticated OK via Azure`, this.account.username, this.account);
        return this.fetchAllTokensAsync();
    }

    protected override async doLoginPopupAsync(): Promise<void> {
        const {client, account} = this,
            opts: PopupRequest = {
                scopes: this.loginScopes,
                extraScopesToConsent: this.loginExtraScopes
            };
        if (account) opts.account = account;
        try {
            const ret = await client.acquireTokenPopup(opts);
            this.account = ret.account;
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
        const {client, account} = this,
            redirectResp = await client.handleRedirectPromise();

        if (!redirectResp) {
            // 1) Initiating - grab state and initiate redirect
            const state = this.captureRedirectState(),
                opts: RedirectRequest = {
                    state,
                    scopes: this.loginScopes,
                    extraScopesToConsent: this.loginExtraScopes
                };
            if (account) opts.account = account;
            await client.acquireTokenRedirect({...opts, account});
            await never();
        } else {
            // 2) Returning - just restore state
            this.account = redirectResp.account;
            const redirectState = redirectResp.state;
            this.restoreRedirectState(redirectState);
        }
    }

    protected override async fetchIdTokenAsync(useCache: boolean = true): Promise<Token> {
        const ret = await this.client.acquireTokenSilent({
            scopes: this.idScopes,
            account: this.account,
            forceRefresh: !useCache,
            prompt: 'none',
            ...this.getRefreshOffsetArgs()
        });
        this.account = ret.account;
        return new Token(ret.idToken);
    }

    protected override async fetchAccessTokenAsync(
        spec: MsalTokenSpec,
        useCache: boolean = true
    ): Promise<Token> {
        const ret = await this.client.acquireTokenSilent({
            scopes: spec.scopes,
            account: this.account,
            forceRefresh: !useCache,
            prompt: 'none',
            ...this.getRefreshOffsetArgs()
        });
        this.account = ret.account;
        return new Token(ret.accessToken);
    }

    protected override async doLogoutAsync(): Promise<void> {
        const {postLogoutRedirectUrl, client, account, loginMethod} = this;
        await client.clearCache({account});
        loginMethod == 'REDIRECT'
            ? await client.logoutRedirect({account, postLogoutRedirectUri: postLogoutRedirectUrl})
            : await client.logoutPopup({account});
    }

    //------------------------
    // Private implementation
    //------------------------
    private async createClientAsync(): Promise<IPublicClientApplication> {
        const config = this.config,
            {clientId, authority, msalLogLevel} = config;

        throwIf(!authority, 'Missing MSAL authority. Please review your configuration.');

        const ret = await msal.PublicClientApplication.createPublicClientApplication({
            auth: {
                clientId,
                authority,
                redirectUri: this.redirectUrl,
                postLogoutRedirectUri: this.postLogoutRedirectUrl
            },
            system: {
                loggerOptions: {
                    loggerCallback: this.logFromMsal,
                    logLevel: msalLogLevel
                }
            }
        });
        return ret;
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
        return union(
            this.idScopes,
            flatMap(this.config.accessTokens, spec =>
                spec.scopes.filter(s => !s.startsWith('api:'))
            )
        );
    }

    private get loginExtraScopes(): string[] {
        return uniq(
            flatMap(this.config.accessTokens, spec => spec.scopes.filter(s => s.startsWith('api:')))
        );
    }

    private getRefreshOffsetArgs(): Partial<SilentRequest> {
        const offset = this.config.initRefreshTokenExpirationOffsetSecs;
        return offset > 0 && this.initialTokenLoad
            ? {forceRefresh: true, refreshTokenExpirationOffsetSeconds: offset}
            : {};
    }
}
