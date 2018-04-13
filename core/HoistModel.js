/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from 'hoist/core';
import {observable, setter, action} from 'hoist/mobx';
import {MultiPromiseModel, never} from 'hoist/promise';
import {RouterModel} from 'hoist/router';

import {
    BaseService,
    ConfigService,
    EnvironmentService,
    ErrorTrackingService,
    FeedbackService,
    FetchService,
    IdentityService,
    LocalStorageService,
    PrefService,
    TrackService
} from 'hoist/svc';


/**
 * Enumeration of possible Load States for HoistModel.
 *
 * See HoistModel.loadState.
 */
export const LoadState = {
    PRE_AUTH: 'PRE_AUTH',
    LOGIN_REQUIRED: 'LOGIN_REQUIRED',
    INITIALIZING: 'INITIALIZING',
    COMPLETE: 'COMPLETE',
    FAILED: 'FAILED'
};

/**
 * Top level model for Hoist.
 *
 * This singleton object represents the main entry point for most of the framework services
 * in Hoist. It provides a number of built-in services for applications and manages/holds
 * the initialization, error handling, and masking state of the app.
 */
export class HoistModel {

    //------------------------
    // Services
    //---------------------------
    configService = new ConfigService();
    environmentService = new EnvironmentService();
    errorTrackingService = new ErrorTrackingService();
    feedbackService = new FeedbackService();
    fetchService = new FetchService();
    identityService = new IdentityService();
    localStorageService = new LocalStorageService();
    prefService = new PrefService();
    trackService = new TrackService();
 
    /** State of app loading -- see HoistLoadState for valid values. */
    @setter @observable loadState = LoadState.PRE_AUTH;

    /** Currently authenticated user. */
    @observable authUsername = null;

    /** Dark theme active? */
    @observable darkTheme = true;

    /**
     * Exception to be shown troubleshooting/display.
     * An object of the form {exception: exception, options: options}
     */
    @observable.ref displayException;

    /** Show about dialog? */
    @observable aboutIsOpen = false;

    /** Top level model for the App - assigned via BaseAppModel's constructor */
    appModel = null;

    /** Router model for the App - used for route based navigation. */
    routerModel = new RouterModel();

    /**
     * Tracks globally loading promises.
     * Link any async operations that should mask the entire application to this model.
     */
    appLoadModel = new MultiPromiseModel();


    //----------------------------------
    // Application Entry points
    //----------------------------------

    /** Trigger a full reload of the app. */
    @action
    reloadApp() {
        this.appLoadModel.link(never());
        window.location.reload(true);
    }

    /** Toggle the theme between light and dark variants. */
    @action
    toggleTheme() {
        this.setDarkTheme(!this.darkTheme);
    }

    /**
     * Show an Exception to the user.
     *
     * Applications should typically use XH.handleException().
     * This method will fully log and track the exception before display.
     * @see ExceptionHandler
     *
     * @param {Object} exception - exception to be shown.
     * @param {Object} [options] - display options.
     */
    @action
    showException(exception, options) {
        this.displayException = {exception, options};
    }

    /** Hide any displayed exception */
    @action
    hideException() {
        this.displayException = null;
    }

    /** Show the About Dialog for this application. */
    @action
    showAbout() {
        this.aboutIsOpen = true;
    }


    //---------------------------------
    // Framework Methods
    //---------------------------------
    /**
     * Called when application mounted in order to trigger initial authentication
     * and initialization of framework and application.
     *
     * Not for application use.
     */
    async initAsync() {
        // Add xh-app class to body element to power Hoist CSS selectors
        document.body.classList.add('xh-app');

        try {
            this.setLoadState(LoadState.PRE_AUTH);

            const username = await this.getAuthUserFromServerAsync();

            if (username) {
                return this.completeInitAsync(username);
            }

            if (this.appModel.requireSSO) {
                throw XH.exception('Failed to authenticate user via SSO.');
            } else {
                this.setLoadState(LoadState.LOGIN_REQUIRED);
            }
        } catch (e) {
            this.setLoadState(LoadState.FAILED);
            XH.handleException(e, {requireReload: true});
        }
    }

    /**
     * Complete initialization with the name of a verified user.
     * Not for application use. Called by framework after user identity has been confirmed.
     *
     * @param {string} username - username of verified user.
     */
    @action
    async completeInitAsync(username) {
        this.authUsername = username;
        this.setLoadState(LoadState.INITIALIZING);
        try {
            await this.initServicesAsync()
                .wait(100)  // delay is workaround for styling issues in dev TODO: Remove
                .then(() => this.initLocalState())
                .then(() => this.appModel.initAsync())
                .then(() => this.initRouterModel());
            this.setLoadState(LoadState.COMPLETE);
        } catch (e) {
            this.setLoadState(LoadState.FAILED);
            XH.handleException(e, {requireReload: true});
        }
    }


    //------------------------
    // Implementation
    //------------------------
    async getAuthUserFromServerAsync() {
        return await this.fetchService
            .fetchJson({url: 'auth/authUser'})
            .then(r => r.authUser.username)
            .catch(() => null);
    }


    async initServicesAsync() {
        const ensureReady = BaseService.ensureSvcsReadyAsync.bind(BaseService);

        await ensureReady(
            this.fetchService,
            this.localStorageService,
            this.errorTrackingService
        );
        await ensureReady(
            this.configService,
            this.prefService
        );
        await ensureReady(
            this.environmentService,
            this.feedbackService,
            this.identityService,
            this.trackService
        );
    }

    initLocalState() {
        this.setDarkTheme(XH.getPref('xhTheme') === 'dark');
    }

    initRouterModel() {
        this.routerModel.init(this.appModel.getRoutes());
    }

    @action
    setDarkTheme(value) {
        const classList = document.body.classList;
        classList.toggle('xh-dark', value);
        classList.toggle('pt-dark', value);
        this.darkTheme = value;
        this.prefService.set('xhTheme', value ? 'dark' : 'light');
    }
}
export const hoistModel = new HoistModel();