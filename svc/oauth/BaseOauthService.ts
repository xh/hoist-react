/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';

/**
 * Abstract Base Service subclassed by services that manage OAuth authentication.
 */

export interface BaseOauthConfig {
    /** Hoist: Is OAuth enabled in this application? */
    enabled: boolean;

    /** Client ID (GUID) of your app registered with your Oauth provider */
    clientId: string;

    /**
     * The redirect URL where authentication responses can be received by your application.
     * It must exactly match one of the redirect URIs registered in the Azure portal, in the SPA section.
     * Default is 'APP_BASE_URL' which will be replaced with the current app's base URL.
     **/
    redirectUrl?: 'APP_BASE_URL' | string;

    /**
     * The redirect URL where the window navigates after a successful logout.
     * Default is 'APP_BASE_URL' which will be replaced with the current app's base URL.
     **/
    postLogoutRedirectUrl?: 'APP_BASE_URL' | string;

    /** The method used for logging in. Default is 'POPUP'. */
    loginMethodDesktop?: 'REDIRECT' | 'POPUP';

    /** The method used for logging in. Default is 'REDIRECT'. */
    loginMethodMobile?: 'REDIRECT' | 'POPUP';

    /**
     * Scopes for ID token.
     * Can be left unset if Oauth is used only for Authentication, just to get username and email.
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
export abstract class BaseOauthService extends HoistService {
    /**
     * Is OAuth enabled in this application?  For bootstrapping, troubleshooting
     * and mobile development, we allow running in a non-SSO mode.
     */
    enabled: boolean;

    /** ID Token in JWT format - for passing to Hoist server. */
    protected idToken?: string;

    /** Soft-config loaded from whitelisted endpoint on UI server. */
    protected config: BaseOauthConfig;

    protected get redirectUrl() {
        const url = this.config.redirectUrl ?? 'APP_BASE_URL';
        return url === 'APP_BASE_URL' ? this.baseUrl : url;
    }

    protected get postLogoutRedirectUrl() {
        const url = this.config.postLogoutRedirectUrl ?? 'APP_BASE_URL';
        return url === 'APP_BASE_URL' ? this.baseUrl : url;
    }

    // Default to true on mobile, false on desktop.
    protected get useRedirect() {
        return XH.isDesktop
            ? (this.config.loginMethodDesktop ?? 'POPUP') === 'REDIRECT'
            : (this.config.loginMethodMobile ?? 'REDIRECT') === 'REDIRECT';
    }

    protected popupBlockerErrorMessage =
        'Login popup window blocked. Please check your browser for a blocked popup notification (typically within the URL bar). Allow all popups from this site, then refresh this page in your browser to try again.';

    protected defaultErrorMsg =
        'We are unable to authenticate you. Please ensure any pop-up windows or alternate browser tabs with this app open are fully closed, then refresh this tab in your browser to reload the application and try again.';

    //------------------------
    // Public API
    //------------------------

    /** Request a full logout from Oauth provider, which will redirect away from this app to a configured URL. */
    abstract logoutAsync(): Promise<void>;

    //------------------------
    // Implementation
    //------------------------
    protected abstract installDefaultFetchServiceHeaders();

    protected get baseUrl() {
        return `${window.location.origin}/${XH.clientAppCode}/`;
    }
}
