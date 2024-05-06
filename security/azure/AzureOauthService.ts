/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import * as msal from '@azure/msal-browser';
import {
    AccountInfo,
    AuthenticationResult,
    InteractionRequiredAuthError,
    IPublicClientApplication
} from '@azure/msal-browser';
import {LogLevel} from '@azure/msal-common/src/logger/Logger';
import {XH} from '@xh/hoist/core';
import {never} from '@xh/hoist/promise';
import {logDebug, logError, logInfo, logWarn, throwIf} from '@xh/hoist/utils/js';
import {BaseOauthConfig, BaseOauthService} from '../BaseOauthService';
import {isEmpty} from 'lodash';

interface AzureOauthConfig extends BaseOauthConfig {
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

/**
 * Service to implement OAuth authentication via Azure Active Directory/MSAL.
 */
export class AzureOauthService extends BaseOauthService {
    static instance: AzureOauthService;

    private client: IPublicClientApplication;

    /** Authenticated account, as most recent auth call with Azure */
    account: AccountInfo;

    override async doInitAsync(): Promise<void> {
        const client = (this.client = await this.createClientAsync());

        let result: AuthenticationResult;
        try {
            const accounts = client.getAllAccounts();
            if (isEmpty(accounts)) {
                result = await client.ssoSilent({scopes: this.idScopes});
            } else {
                result = await client.acquireTokenSilent({
                    scopes: this.idScopes,
                    account: accounts[0]
                });
            }
        } catch (e) {
            if (!(e instanceof InteractionRequiredAuthError)) throw e;

            logDebug('SSO Failed, logging in interactively', e);
            result =
                this.loginMethod === 'REDIRECT'
                    ? await this.completeViaRedirectAsync()
                    : await this.completeViaPopupAsync();
            this.logDebug(
                `(Re)authenticated OK via Azure`,
                result.account.username,
                result.account
            );
        }

        this.account = result.account;
        this.idToken = result.account.idToken;
    }

    override async doLogoutAsync(): Promise<void> {
        const {postLogoutRedirectUrl, client, account} = this;
        await client.logoutRedirect({account, postLogoutRedirectUri: postLogoutRedirectUrl});
    }

    override async getAccessTokenAsync(
        scopes: string[],
        allowPopup: boolean = false
    ): Promise<string> {
        const {client, account} = this;

        let ret: AuthenticationResult;
        try {
            ret = await client.acquireTokenSilent({scopes, account});
        } catch (e) {
            if (!allowPopup || !(e instanceof InteractionRequiredAuthError)) throw e;
            ret = await client.acquireTokenPopup({scopes, account});
        }
        return ret.accessToken;
    }

    //------------------------
    // Implementation
    //------------------------
    private async createClientAsync(): Promise<IPublicClientApplication> {
        const config = this.config as AzureOauthConfig,
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

    private async completeViaRedirectAsync(): Promise<AuthenticationResult> {
        const {client, idScopes} = this,
            redirectResp = await client.handleRedirectPromise();

        if (!redirectResp) {
            // 1) Initiating - grab state and initiate redirect
            const state = this.captureRedirectState();
            const account = client.getAllAccounts()[0];
            account
                ? await client.acquireTokenRedirect({state, scopes: idScopes, account: account})
                : await client.loginRedirect({state, scopes: idScopes});
            await never();
        } else {
            // 2) Returning - just restore state
            const redirectState = redirectResp.state;
            this.restoreRedirectState(redirectState);
            return redirectResp;
        }
    }

    private async completeViaPopupAsync(): Promise<AuthenticationResult> {
        const {client, idScopes} = this;
        const account = client.getAllAccounts()[0];
        try {
            return account
                ? await client.acquireTokenPopup({scopes: idScopes, account: account})
                : await client.loginPopup({scopes: idScopes});
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
}
