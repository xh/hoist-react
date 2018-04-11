/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {ErrorDialogModel} from 'hoist/core';
import {observable, setter, action} from 'hoist/mobx';
import {MultiPromiseModel, never} from 'hoist/promise';
import {RouterModel} from 'hoist/router';

import {
    BaseService,
    ConfigService,
    EnvironmentService,
    ExceptionHandlerService,
    ErrorTrackingService,
    FeedbackService,
    FetchService,
    IdentityService,
    LocalStorageService,
    PrefService,
    TrackService,
    EventService
} from 'hoist/svc';

/**
 * Top level model for Hoist
 */
class HoistModel {

    //------------------------
    // Services
    //---------------------------
    configService = new ConfigService();
    environmentService = new EnvironmentService();
    exceptionHandlerService = new ExceptionHandlerService();
    errorTrackingService = new ErrorTrackingService();
    feedbackService = new FeedbackService();
    fetchService = new FetchService();
    identityService = new IdentityService();
    localStorageService = new LocalStorageService();
    prefService = new PrefService();
    trackService = new TrackService();
    eventService = new EventService();

    /**
     * State of app loading.
     *
     * This property can take the following states:
     * NOT_LOADED | AUTHENTICATING | LOGIN_REQUIRED | SSO_FAILED | COMPLETE | FAILED
     */
    @setter @observable loadState = 'NOT_LOADED';

    /** Currently authenticated user. **/
    @observable authUsername = null;

    /** Dark theme active? **/
    @observable darkTheme = true;

    /** Tracks recent errors for troubleshooting/display */
    errorDialogModel = new ErrorDialogModel();

    /** Show about dialog? **/
    @observable @setter showAbout = false;

    /** Top level model for the App - assigned via BaseAppModel's constructor **/
    appModel = null;

    /** Router model for the app - used for route based navigation. **/
    routerModel = new RouterModel();

    /**
     * Tracks globally loading promises.
     * Bind any async operations that should mask the entire application to this model.
     **/
    appLoadModel = new MultiPromiseModel();

    /**
     * Call this once when application mounted in order to
     * trigger initial authentication and initialization of application.
     */
    async initAsync() {
        // Add xh-app class to body element to power Hoist CSS selectors
        document.body.classList.add('xh-app');

        this.setLoadState('AUTHENTICATING');
        const authUser = await this.fetchService
            .fetchJson({url: 'auth/authUser'})
            .then(r => r.authUser.username)
            .catch(() => null);


        if (!authUser && this.appModel.requireSSO) {
            this.setLoadState('SSO_FAILED');
        } else {
            this.markAuthenticatedUser(authUser);
        }
    }

    /**
     * Trigger a full reload of the app.
     */
    @action
    reloadApp() {
        this.appLoadModel.link(never());
        window.location.reload(true);
    }

    /**
     * Call to mark the authenticated user.
     * @param username of verified user - null to indicate auth failure / unidentified user.
     */
    @action
    markAuthenticatedUser(username) {
        this.authUsername = username;

        if (username && !this.isInitialized) {
            // 100ms delay works around styling issues introduced by 2/2018 web pack loading changes. TODO: Remove
            this.initServicesAsync()
                .wait(100)
                .then(() => this.initLocalState())
                .then(() => this.appModel.initAsync())
                .then(() => this.initRouterModel())
                .then(() => this.setLoadState('COMPLETE'))
                .catch(e => {
                    this.setLoadState('FAILED');
                    XH.handleException(e);
                });
        }
    }

    toggleTheme() {
        this.setDarkTheme(!this.darkTheme);
    }

    //------------------------------------
    // Implementation
    //------------------------------------
    async initServicesAsync() {
        const ensureReady = BaseService.ensureSvcsReadyAsync.bind(BaseService);

        await ensureReady(this.fetchService, this.localStorageService);
        await ensureReady(this.configService, this.prefService);
        await ensureReady(
            this.environmentService,
            this.exceptionHandlerService,
            this.errorTrackingService,
            this.feedbackService,
            this.identityService,
            this.trackService,
            this.eventService
        );
    }

    initLocalState() {
        this.setDarkTheme(this.prefService.get('xhTheme') === 'dark');
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