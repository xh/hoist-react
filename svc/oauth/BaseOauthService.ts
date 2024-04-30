/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistService, Some, XH} from '@xh/hoist/core';


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

    /** The method used for logging in. Default is 'POPUP' on desktop and 'REDIRECT' on mobile. */
    loginMethod?: 'REDIRECT' | 'POPUP';

    idScopes?: Some<string>;

    accessScopes?: Some<string>;
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
    idToken?: string;

    /** Soft-config loaded from whitelisted endpoint on UI server. */
    config: BaseOauthConfig;

    get redirectUrl() {
        const url = this.config.redirectUrl ?? 'APP_BASE_URL';
        return url === 'APP_BASE_URL' ? this.baseUrl : url;
    }

    get postLogoutRedirectUrl() {
        const url = this.config.postLogoutRedirectUrl ?? 'APP_BASE_URL';
        return url === 'APP_BASE_URL' ? this.baseUrl : url;
    }

    // Default to redirect on mobile, popup on desktop.
    get useRedirect() {
        const {loginMethod} = this.config;
        if (loginMethod) {
            return loginMethod === 'REDIRECT';
        }

        return !XH.isDesktop;
    }

    protected popupBlockerErrorTitle = 'Login popup window blocked';
    protected popupBlockerErrorMessage =
        'Please check your browser for a blocked popup notification (typically within the URL bar). Allow all popups from this site, then refresh this page in your browser to try again.';

    protected defaultErrorMsg =
        'We are unable to authenticate you. Please ensure any pop-up windows or alternate browser tabs with this app open are fully closed, then refresh this tab in your browser to reload the application and try again.';

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

    /** Request a full logout from MSAL, which will redirect away from this app to a configured URL. */
    abstract logoutAsync(): Promise<void>


    abstract getTokenAsync()

    //------------------------
    // Implementation
    //------------------------

    protected abstract installDefaultFetchServiceHeaders()

    abstract loginAsync()

    protected get baseUrl() {
        return `${window.location.origin}/${XH.clientAppCode}/`;
    }
}
