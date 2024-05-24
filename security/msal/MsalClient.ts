/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import * as msal from '@azure/msal-browser';
import {
    AccountInfo,
    InteractionRequiredAuthError,
    IPublicClientApplication,
    PopupRequest,
    RedirectRequest
} from '@azure/msal-browser';
import {LogLevel} from '@azure/msal-common';
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

    /** The log level of MSAL. Default is LogLevel.Info (2). */
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

    //-------------------------------------------
    // Implementations of core lifecycle methods
    //-------------------------------------------
    protected override async doInitAsync(): Promise<TokenMap> {
        const client = (this.client = await this.createClientAsync());

        // Try to optimistically load tokens silently
        this.account = client.getAllAccounts()[0];
        if (this.account) {
            try {
                return await this.fetchAllTokensAsync();
            } catch (e) {
                if (!(e instanceof InteractionRequiredAuthError)) {
                    throw e;
                }
                this.logDebug('Failed to load tokens on init, falling back on login', e);
            }
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
            prompt: 'none'
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
            prompt: 'none'
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
                    logLevel: msalLogLevel ?? 1
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
}
