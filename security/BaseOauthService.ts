/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistService, PlainObject, XH} from '@xh/hoist/core';
import {FetchOptions} from '@xh/hoist/svc';
import {MINUTES, olderThan} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {find, isEmpty} from 'lodash';
import {v4 as uuid} from 'uuid';

export interface BaseOauthConfig {
    /** Is OAuth enabled in this application? */
    enabled: boolean;

    /** Client ID (GUID) of your app registered with your Oauth provider. */
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

    /** The method used for logging in on desktop. Default is 'POPUP'. */
    loginMethodDesktop?: 'REDIRECT' | 'POPUP';

    /** The method used for logging in on mobile. Default is 'REDIRECT'. */
    loginMethodMobile?: 'REDIRECT' | 'POPUP';

    /**
     * Scopes for ID token.
     * Defaults to user.read, openid, profile, email
     */
    idScopes?: string[];
}

/**
 * Abstract Base Service for services that manage OAuth authentication.
 *
 * Implementations of this class coordinate OAuth-based login.
 *
 * This service is designed to be initialized in the `preAuthInitAsync()` lifecycle methods of the
 * relevant AppModels. It is instantiated and initialized prior to any attempts to authenticate to
 * the app's own Grails server. If the user is not authenticated, the implementation should
 * pop-up/redirect to an Oauth flow, then return here and process the completed authentication,
 * supplying an identity token in JWT format. This service then installs that token as a default
 * header on all fetch calls.  The server will look for the token and validates its signature
 * to verify and identify the end user.
 */
export abstract class BaseOauthService extends HoistService {

    /** ID Token in JWT format - for passing to Hoist server. */
    protected idToken?: string;

    /** Soft-config loaded from UI server. */
    protected config: BaseOauthConfig;

    /** Configured idScopes*/
    protected idScopes: string[];


    protected get redirectUrl() {
        const url = this.config.redirectUrl ?? 'APP_BASE_URL';
        return url === 'APP_BASE_URL' ? this.baseUrl : url;
    }

    protected get postLogoutRedirectUrl() {
        const url = this.config.postLogoutRedirectUrl ?? 'APP_BASE_URL';
        return url === 'APP_BASE_URL' ? this.baseUrl : url;
    }

    protected get loginMethod(): 'REDIRECT' | 'POPUP' {
        return XH.isDesktop
            ? (this.config.loginMethodDesktop ?? 'POPUP')
            : (this.config.loginMethodMobile ?? 'REDIRECT');
    }

    protected get baseUrl() {
        return `${window.location.origin}/${XH.clientAppCode}/`;
    }

    protected popupBlockerErrorMessage: String =
        'Login popup window blocked. Please check your browser for a blocked popup notification (typically within the URL bar). Allow all popups from this site, then refresh this page in your browser to try again.';

    protected defaultErrorMsg: String =
        'We are unable to authenticate you. Please ensure any pop-up windows or alternate browser tabs with this app open are fully closed, then refresh this tab in your browser to reload the application and try again.';

    //------------------------
    // Public API
    //------------------------
    /**
     * Main entry point for this service.
     *
     * This method is designed to be called in the `preAuthInitAsync()` lifecycle methods of the
     * relevant AppModels.  Note that this service is initialized prior to Hoist auth/init, so we
     * do *not* have our standard XH.configService ready to go at the point we need these configs.
     */
    override async initAsync(): Promise<void> {
        const config = this.config = await XH.fetchJson({url: 'xh/oauthConfig'});
        this.logDebug('OAuth config fetched OK from server', config);
        throwIf(!config.clientId, 'Missing OAuth clientId. Please review your configuration.');
        this.idScopes = config.idScopes ?? ['user.read', 'openid', 'profile', 'email'];


        await this.doInitAsync();
        throwIf(!this.idToken, 'Failed Oauth authentication. No user or token found.');

        // Add token to headers for any *local* urls going back to grails server.
        XH.fetchService.addDefaultHeaders(opts => {
            return !opts.url.startsWith('http') ? this.getDefaultHeaders(opts) : null;
        });
    }

    /**
     * Request a full logout from Oauth provider.
     * Should redirect away from this app to the pre-configured URL.
     */
    async logoutAsync(): Promise<void> {
        try {
            // Logout of Hoist session here *before* oAuth implementations.
            await XH.fetchJson({url: 'xh/logout'});
            await this.doLogoutAsync();
        } catch (e) {
            this.logError('Error during logout', e);
        }
    }

    /**
     * Request a valid access token for the authenticated user.
     *
     * Depending on login method, this may trigger user prompts, or redirects if
     * required due to timeouts, or other protocol requirements.
     */
    abstract getAccessTokenAsync(scopes: string[], loginWithPopup?:boolean): Promise<string>;


    //------------------------------------
    // Implementation/Template methods
    //-----------------------------------
    protected abstract doInitAsync(): Promise<void>;
    protected abstract doLogoutAsync(): Promise<void>;

    protected getDefaultHeaders(opts: FetchOptions): PlainObject {
        const {idToken} = this;
        return idToken ? {'x-xh-idt': idToken} : {};
    }

    /**
     * Call before redirect flow, to snapshot needed state to
     * be restored after redirect.
     *
     * @return key for re-accessing this state, to be round-tripped
     * with redirect.
     */
    protected captureRedirectState(): string {
        const state = {
            key: uuid(),
            timestamp: Date.now(),
            search: location.search
        };

        const recs = XH.localStorageService
            .get('xhOAuthState', [])
            .filter(r => !olderThan(r.timestamp, 5 * MINUTES));

        recs.push(state);
        XH.localStorageService.set('xhOAuthState', recs);
        return state.key;
    }

    /**
     * Call after redirect flow, to rehydrate state.
     *
     * @param key - key for re-accessing this state, as round-tripped
     * with redirect.
     */
    protected restoreRedirectState(key: string) {
        const state = find(XH.localStorageService.get('xhOAuthState', []), {key});
        throwIf(!state, 'Failure in OAuth, no redirect state located.');

        const {search} = state,
            url = isEmpty(search) ? '/' : location.origin + location.pathname + search;
        window.history.replaceState(null, '', url);
    }
}
