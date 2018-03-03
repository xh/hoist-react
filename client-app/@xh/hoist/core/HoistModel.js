/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {ErrorDialogModel} from 'hoist/core';
import {observable, setter, action} from 'hoist/mobx';
import {MultiPromiseModel, never} from 'hoist/promise';

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

    /** Has the authentication step completed? **/
    @observable authCompleted = false;

    /** Currently authenticated user. **/
    @observable authUsername = null;

    /** Are all Hoist services successfully initialized? **/
    @setter @observable isInitialized = false;

    /** Dark theme active? **/
    @setter @observable darkTheme = true;

    /** Tracks recent errors for troubleshooting/display */
    errorDialogModel = new ErrorDialogModel();

    /** Show about dialog? **/
    @observable @setter showAbout = false;

    /** Top level model for theApp **/
    appModel = null;

    /**
     * Tracks globally loading promises.
     *
     * Applications should bind any async operations that should mask
     * the entire application to this model.
     **/
    appLoadModel = new MultiPromiseModel();

    /**
     * Call this once when application mounted in order to
     * trigger initial authentication and initialization of application.
     */
    async initAsync() {
        return this.fetchService.fetchJson({url: 'auth/authUser'})
            .then(r => this.markAuthenticatedUser(r.authUser.username))
            .catch(e => this.markAuthenticatedUser(null));
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
     *
     * @param username of verified user. Use null to indicate an
     * authentication failure and an unidentified user.
     */
    @action
    markAuthenticatedUser(username) {
        this.authUsername = username;
        this.authCompleted = true;

        if (username && !this.isInitialized) {
            // 100ms delay works around styling issues introduced by 2/2018 web pack loading changes. TODO: Remove
            this.initServicesAsync()
                .wait(100)
                .then(() => this.initLocalState())
                .then(() => this.appModel.initAsync())
                .then(() => this.setIsInitialized(true))
                .catchDefault();
        }
    }

    @action
    toggleTheme() {
        this.setDarkTheme(!this.darkTheme);
        this.prefService.set('xhTheme', this.darkTheme ? 'dark' : 'light');
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
}
export const hoistModel = new HoistModel();