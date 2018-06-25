/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import ReactDOM from 'react-dom';
import {isPlainObject, defaults} from 'lodash';

import {elem, HoistModel} from '@xh/hoist/core';
import {Exception, ExceptionHandler} from '@xh/hoist/exception';
import {observable, setter, action} from '@xh/hoist/mobx';
import {MultiPromiseModel, never} from '@xh/hoist/promise';
import {RouterModel} from '@xh/hoist/router';
import {appContainer} from '@xh/hoist/app';
import {MessageSourceModel} from '@xh/hoist/cmp/message';
import {FeedbackDialogModel} from '@xh/hoist/cmp/feedback';
import {throwIf} from '@xh/hoist/utils/JsUtils';

import {
    ConfigService,
    EnvironmentService,
    ErrorTrackingService,
    FeedbackService,
    FetchService,
    IdentityService,
    LocalStorageService,
    PrefService,
    TrackService
} from '@xh/hoist/svc';


import {initServicesAsync} from './HoistService';

import '../styles/XH.scss';

// noinspection JSUnresolvedVariable

/**
 * Top-level Singleton model for Hoist.  This is the main entry point for the API.
 *
 * It provide access to the built-in Hoist services, metadata about the application and environment,
 * and convenience aliases to the most common framework operations. It also maintains key observable
 * application state regarding dialogs, loading, and exceptions.
 *
 * Available to applications via import as 'XH'- installed as window.XH for troubleshooting purposes.
 */
@HoistModel()
class XHClass {

    constructor() {
        this.aliasMethods();
    }

    //------------------------------------------------------------------
    // Metadata
    // The values below are set via webpack.DefinePlugin at build time.
    // See @xh/hoist-dev-utils/configureWebpack.
    //------------------------------------------------------------------
    /** Short internal code for the application. */
    appCode = xhAppCode;

    /** User-facing display name for the application. */
    appName = xhAppName;

    /** SemVer or Snapshot version of the client build. */
    appVersion = xhAppVersion;

    /** Git commit hash (or equivalent) of the client build. */
    appBuild = xhAppBuild;

    /** Root URL context/path - prepended to all relative fetch requests. */
    baseUrl = xhBaseUrl;

    /** Whether build is for local development */
    isDevelopmentMode = xhIsDevelopmentMode;

    //---------------------------
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

    //-----------------------------
    // Observable State
    //-----------------------------
    /** State of app loading -- see HoistLoadState for valid values. */
    @setter @observable loadState = LoadState.PRE_AUTH;

    /** Currently authenticated user. */
    @observable authUsername = null;

    /** Dark theme active? */
    @observable darkTheme = false; // actual default value comes from preference

    /**
     * Exception to be shown troubleshooting/display.
     * An object of the form {exception: exception, options: options}
     */
    @observable.ref displayException;

    /** Show about dialog? */
    @observable aboutIsOpen = false;

    /** Updated App version available, as reported by server. */
    @observable updateVersion = null;

    /** Currently running HoistApp - set in `renderApp()` below. */
    app = null;

    /** Router model for the App - used for route based navigation. */
    routerModel = new RouterModel();

    /** Set by output of app.checkAccess() if that initial auth check fails. */
    accessDeniedMessage = null;

    /**
     * Tracks globally loading promises.
     * Link any async operations that should mask the entire application to this model.
     */
    appLoadModel = new MultiPromiseModel();

    messageSourceModel = new MessageSourceModel();

    feedbackModel = new FeedbackDialogModel();

    /**
     * Main entry point. Initialize and render application code.
     *
     * @param {Object} app - object containing main application state and logic.  Should
     *      be an instance of a class decorated with @HoistApp.
     */
    renderApp(app) {
        this.app = app;
        throwIf(
            !app.componentClass,
            'A HoistApp must define a componentClass getter to specify its top-level component.'
        );

        const rootView = appContainer(
            elem(app.componentClass, {model: app})
        );

        ReactDOM.render(rootView, document.getElementById('root'));
    }

    /** Route the app.  See RouterModel.navigate.  */
    navigate(...args) {
        this.routerModel.navigate(...args);
    }

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

    /** Hide any displayed exception. */
    @action
    hideException() {
        this.displayException = null;
    }

    /** Show the About Dialog for this application. */
    @action
    showAbout() {
        this.aboutIsOpen = true;
    }

    /** Hide the About Dialog for this application. */
    @action
    hideAbout() {
        this.aboutIsOpen = false;
    }

    /**
     * Show the update toolbar prompt. Called by EnvironmentService when the server reports that a
     * new (or at least different) version is available and the user should be prompted.
     * @param {string} updateVersion
     */
    @action
    showUpdateBar(updateVersion) {
        this.updateVersion = updateVersion;
    }

    //------------------------------
    // Message Support
    //------------------------------

    /**
     * Show a modal message dialog.
     *
     * @param {Object} config - see MessageModel.show() for available options.
     */
    message(config) {
        return this.messageSourceModel.show(config);
    }

    /**
     * Show a modal 'alert' dialog.
     * This method will display an alert message with a default confirm button.
     *
     * @param {Object} config -  see MessageModel.show() for available options.
     */
    alert(config) {
        config = defaults({}, config, {confirmText: 'OK'});
        return this.messageSourceModel.show(config);
    }

    /**
     * Show a modal 'confirm' dialog.
     * This method will display a message with default confirm and cancel buttons.
     *
     *  @param {Object} config - see MessageModel.show() for available options.
     */
    confirm(config) {
        config = defaults({}, config, {confirmText: 'OK', cancelText: 'Cancel'});
        this.messageSourceModel.show(config);
    }

    //-------------------
    // Feedback Support
    //-------------------

    showFeedbackDialog() {
        this.feedbackModel.open();
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

            const authUser = await this.getAuthUserFromServerAsync();

            if (!authUser) {
                throwIf(this.app.requireSSO, 'Failed to authenticate user via SSO.');

                this.setLoadState(LoadState.LOGIN_REQUIRED);
                return;
            }

            await this.completeInitAsync(authUser.username);

        } catch (e) {
            this.setLoadState(LoadState.FAILED);
            XH.handleException(e, {requireReload: true});
        }
    }

    /**
     * Complete initialization.
     * Not for application use. Called by framework after user identity has been confirmed.
     *
     */
    @action
    async completeInitAsync() {
        this.setLoadState(LoadState.INITIALIZING);
        try {
            await this.initServicesAsync()
                .wait(100);  // delay is workaround for styling issues in dev TODO: Remove

            this.initLocalState();

            const access = this.app.checkAccess(XH.getUser());
            if (!access.hasAccess) {
                this.accessDeniedMessage = access.message || 'Access denied.';
                this.setLoadState(LoadState.ACCESS_DENIED);
                return;
            }

            await this.app.initAsync();
            this.initRouterModel();
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
            .then(r => r.authUser);
    }

    async initServicesAsync() {
        await initServicesAsync(
            this.fetchService,
            this.localStorageService,
            this.errorTrackingService
        );
        await initServicesAsync(
            this.configService,
            this.prefService
        );
        await initServicesAsync(
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
        this.routerModel.init(this.app.getRoutes());
    }

    @action
    setDarkTheme(value) {
        const classList = document.body.classList;
        classList.toggle('xh-dark', value);
        classList.toggle('pt-dark', value);
        this.darkTheme = value;
        this.prefService.set('xhTheme', value ? 'dark' : 'light');
    }

    aliasMethods() {
        this.createMethodAliases(this.trackService,             ['track']);
        this.createMethodAliases(this.fetchService,             ['fetchJson', 'fetch']);
        this.createMethodAliases(this.identityService,          ['getUser']);
        this.createMethodAliases(this.configService,            {getConf: 'get'});
        this.createMethodAliases(this.prefService,              {getPref: 'get', setPref: 'set'});
        this.createMethodAliases(this.environmentService,       {getEnv: 'get'});
        this.createMethodAliases(Exception,                     {exception: 'create'});
        this.createMethodAliases(ExceptionHandler,              ['handleException']);

    }

    createMethodAliases(src, aliases) {
        const bindFn = (tgtName, srcName) => this[tgtName] = src[srcName].bind(src);
        if (isPlainObject(aliases)) {
            for (const name in aliases) {
                bindFn(name, aliases[name]);
            }
        } else {
            aliases.forEach(name => bindFn(name, name));
        }
    }
    
    destroy() {
        this.safeDestroy(this.appLoadModel, this.routerModel);
        this.safeDestroy(
            this.configService,
            this.environmentService,
            this.errorTrackingService,
            this.feedbackService,
            this.fetchService,
            this.identityService,
            this.localStorageService,
            this.prefService,
            this.trackService
        );
    }

    /**
     * Helper method to destroy resources safely (e.g. child HoistModels). Will quietly skip args
     * that are null / undefined or that do not implement destroy().
     *
     * @param {...Object} args - Objects to be destroyed.
     */
    safeDestroy(...args) {
        args.forEach(it => {
            if (it && it.destroy) it.destroy();
        });
    }
}
export const XH = window.XH = new XHClass();

/**
 * Enumeration of possible Load States for Hoist.
 *
 * See XH.loadState.
 */
export const LoadState = {
    PRE_AUTH: 'PRE_AUTH',
    LOGIN_REQUIRED: 'LOGIN_REQUIRED',
    ACCESS_DENIED: 'ACCESS_DENIED',
    INITIALIZING: 'INITIALIZING',
    COMPLETE: 'COMPLETE',
    FAILED: 'FAILED'
};
