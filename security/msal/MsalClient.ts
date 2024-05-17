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
import {PlainObject, XH} from '@xh/hoist/core';
import {never} from '@xh/hoist/promise';
import {logDebug, logError, logInfo, logWarn, throwIf} from '@xh/hoist/utils/js';
import {flatMap, union, uniq} from 'lodash';
import {BaseOAuthClient, BaseOAuthClientConfig} from '../BaseOAuthClient';

export interface MsalClientConfig extends BaseOAuthClientConfig<MsalAccessTokenConfig> {
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

export interface MsalAccessTokenConfig {
    /** Scopes for the desired access token. */
    scopes: string[];
}

/**
 * Service to implement OAuth authentication via MSAL.
 */
export class MsalClient extends BaseOAuthClient<MsalClientConfig> {
    private client: IPublicClientApplication;
    private account: AccountInfo; // Authenticated account, as most recent auth call with Azure.

    override async doInitAsync(): Promise<void> {
        const client = (this.client = await this.createClientAsync());

        this.account = client.getAllAccounts()[0];

        if (this.account) {
            try {
                return await this.loadTokensAsync();
            } catch (e) {
                if (!(e instanceof InteractionRequiredAuthError)) {
                    throw e;
                }
                this.logDebug('Failed to load tokens on init, falling back on login', e);
            }
        }

        this.usesRedirect
            ? await this.completeViaRedirectAsync()
            : await this.completeViaPopupAsync();
        this.logDebug(`(Re)authenticated OK via Azure`, this.account.username, this.account);

        // Second-time (after login) the charm!
        await this.loadTokensAsync();
    }

    override async getIdTokenAsync(useCache: boolean = true): Promise<string> {
        const ret = await this.client.acquireTokenSilent({
            scopes: this.idScopes,
            account: this.account,
            forceRefresh: !useCache
        });
        this.account = ret.account;
        return ret.idToken;
    }

    override async getAccessTokenAsync(
        spec: PlainObject,
        useCache: boolean = true
    ): Promise<string> {
        const ret = await this.client.acquireTokenSilent({
            scopes: spec.scopes,
            account: this.account,
            forceRefresh: !useCache
        });
        this.account = ret.account;
        return ret.accessToken;
    }

    override async doLogoutAsync(): Promise<void> {
        const {postLogoutRedirectUrl, client, account, usesRedirect} = this;
        await client.clearCache({account});
        usesRedirect
            ? await client.logoutRedirect({account, postLogoutRedirectUri: postLogoutRedirectUrl})
            : await client.logoutPopup({account});
    }

    //------------------------
    // Implementation
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
        this.logDebug('MSAL client created', ret);
        return ret;
    }

    private async completeViaRedirectAsync(): Promise<void> {
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
            account
                ? await client.acquireTokenRedirect({...opts, account})
                : await client.loginRedirect(opts);

            await never();
        } else {
            // 2) Returning - just restore state
            this.account = redirectResp.account;
            const redirectState = redirectResp.state;
            this.restoreRedirectState(redirectState);
        }
    }

    private async completeViaPopupAsync(): Promise<void> {
        const {client, account} = this,
            opts: PopupRequest = {
                scopes: this.loginScopes,
                extraScopesToConsent: this.loginExtraScopes
            };
        try {
            const ret = account
                ? await client.acquireTokenPopup({...opts, account})
                : await client.loginPopup(opts);

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
