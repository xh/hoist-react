/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {
    HoistService,
    AppSpec,
    AppState,
    createElement,
    Exception,
    ExceptionHandlerOptions,
    ExceptionHandler,
    TrackOptions,
    SizingMode,
    HoistServiceClass,
    Theme,
    PlainObject
} from './';
import {Store} from '@xh/hoist/data';
import {instanceManager} from './impl/InstanceManager';
import {installServicesAsync} from './impl/InstallServices';
import {Icon} from '@xh/hoist/icon';
import {action, makeObservable, observable, reaction as mobxReaction} from '@xh/hoist/mobx';
import {never, wait} from '@xh/hoist/promise';
import {
    AlertBannerService,
    AutoRefreshService,
    ChangelogService,
    ConfigService,
    EnvironmentService,
    FetchService,
    GridAutosizeService,
    GridExportService,
    IdentityService,
    IdleService,
    InspectorService,
    JsonBlobService,
    LocalStorageService,
    PrefService,
    TrackService,
    WebSocketService,
    FetchOptions
} from '@xh/hoist/svc';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES} from '@xh/hoist/utils/datetime';
import {
    checkMinVersion,
    getClientDeviceInfo,
    throwIf
} from '@xh/hoist/utils/js';
import {camelCase, compact, flatten, isBoolean, isString, uniqueId} from 'lodash';
import {createRoot} from 'react-dom/client';
import parser from 'ua-parser-js';
import {AppContainerModel} from '../appcontainer/AppContainerModel';
import {ToastModel} from '../appcontainer/ToastModel';
import {BannerModel} from '../appcontainer/BannerModel';
import '../styles/XH.scss';
import {ModelSelector, HoistModel, RefreshContextModel} from './model';
import {HoistAppModel, RouterModel, BannerSpec, ToastSpec, MessageSpec, HoistUser, TaskObserver} from './';

const MIN_HOIST_CORE_VERSION = '14.4';


declare const xhAppCode: string;
declare const xhAppName: string;
declare const xhAppVersion: string;
declare const xhAppBuild: string;
declare const xhBaseUrl: string;
declare const xhIsDevelopmentMode: boolean;


/**
 * Top-level Singleton model for Hoist. This is the main entry point for the API.
 *
 * Provides access to the built-in Hoist services, metadata about the application and environment,
 * and convenience aliases to the most common framework operations. It also maintains key observable
 * application state regarding dialogs, loading, and exceptions.
 *
 * Available via import as `XH` - also installed as `window.XH` for troubleshooting purposes.
 */
export class XHClass {

    private _initCalled: boolean = false;
    private _lastActivityMs: number = Date.now();
    private _uaParser: any = null;

    constructor() {
        makeObservable(this);
        this.exceptionHandler = new ExceptionHandler();
    }

    //----------------------------------------------------------------------------------------------
    // Metadata - set via webpack.DefinePlugin at build time.
    // See @xh/hoist-dev-utils/configureWebpack.
    //----------------------------------------------------------------------------------------------
    /** short internal code for the application. */
    appCode: string = xhAppCode;

    /** user-facing display name for the app. See also `XH.clientAppName`. */
    appName: string = xhAppName;

    /** semVer or Snapshot version of the client build. */
    appVersion: string = xhAppVersion;

    /**
     * optional identifier for the client build (e.g. a git commit hash or a
     * build ID from a CI system). Varies depending on how builds are configured.
     */
    appBuild: string = xhAppBuild;

    /** root URL context/path - prepended to all relative fetch requests. */
    baseUrl: string = xhBaseUrl;

    /** true if app is running in a local development environment. */
    isDevelopmentMode: boolean = xhIsDevelopmentMode;

    //----------------------------------------------------------------------------------------------
    // Hoist Core Services
    // Singleton instances of each service are created and installed within initAsync() below.
    //----------------------------------------------------------------------------------------------
    alertBannerService: AlertBannerService;
    autoRefreshService: AutoRefreshService;
    changelogService: ChangelogService;
    configService: ConfigService;
    environmentService: EnvironmentService;
    fetchService: FetchService;
    gridAutosizeService: GridAutosizeService;
    gridExportService: GridExportService;
    identityService: IdentityService;
    idleService: IdleService;
    inspectorService: InspectorService;
    jsonBlobService: JsonBlobService;
    localStorageService: LocalStorageService;
    prefService: PrefService;
    trackService: TrackService;
    webSocketService: WebSocketService;

    /** Get a reference to a singleton service by camel case name.*/
    getService(name: string): HoistService;

    /** Get a reference to a singleton service by full class. */
    getService<T extends HoistService>(cls: HoistServiceClass<T>): T;

    getService(arg: any) {
        const name = isString(arg) ? arg : camelCase(arg.name);
        return this[name];
    }

    //----------------------------------------------------------------------------------------------
    // Aliased methods
    // Shortcuts to common core service methods and appSpec properties.
    //----------------------------------------------------------------------------------------------
    fetch(opts: FetchOptions) {
        return this.fetchService.fetch(opts);
    }

    fetchJson(opts: FetchOptions) {
        return this.fetchService.fetchJson(opts);
    }

    /**
     * Primary convenience alias for reading soft configuration values.
     * @param key - identifier of the config to return.
     * @param defaultVal - value to return if there is no client-side config with this key.
     * @returns the soft-configured value.
     */
    getConf(key: string, defaultVal?: any): any {
        return this.configService.get(key, defaultVal);
    }

    /**
     * Primary convenience alias for reading user preference values.
     * @param key - identifier of the pref to return.
     * @param defaultVal - value to return if there is no pref with this key.
     * @returns the user's preference, or the data-driven default if pref not yet set by user.
     */
    getPref(key: string, defaultVal?: any): any {
        return this.prefService.get(key, defaultVal);
    }

    /**
     * Primary convenience alias for setting user preference values.
     * @param key - identifier of the pref to set.
     * @param val - the new value to persist for the current user.
     */
    setPref(key: string, val: any) {
        return this.prefService.set(key, val);
    }

    track(opts: string|TrackOptions) {
        return this.trackService?.track(opts);
    }

    getEnv(key: string) {
        return this.environmentService?.get(key) ?? null;
    }

    getUser(): HoistUser {
        return this.identityService?.user ?? null;
    }

    getUsername(): string {
        return this.identityService?.username ?? null;
    }

    get isMobileApp(): boolean {
        return this.appSpec.isMobileApp;
    }

    get clientAppCode(): string {
        return this.appSpec.clientAppCode;
    }

    get clientAppName(): string {
        return this.appSpec.clientAppName;
    }

    get isPhone(): boolean {
        return this.uaParser.getDevice().type === 'mobile';
    }

    get isTablet(): boolean {
        return this.uaParser.getDevice().type === 'tablet';
    }

    get isDesktop(): boolean {
        return this.uaParser.getDevice().type === undefined;
    }

    //---------------------------
    // Models
    //---------------------------
    appContainerModel: AppContainerModel = new AppContainerModel();
    routerModel: RouterModel = new RouterModel();

    //---------------------------
    // Other State
    //---------------------------
    suspendData = null;
    accessDeniedMessage: string = null;
    exceptionHandler: ExceptionHandler = null;

    /** current lifecycle state of the application. */
    @observable
    appState: AppState = 'PRE_AUTH';

    /** milliseconds since user activity / interaction was last detected. */
    get lastActivityMs(): number {
        return this._lastActivityMs;
    }

    /** true if application initialized and running (observable). */
    get appIsRunning(): boolean {
        return this.appState === 'RUNNING';
    }

    /** The currently authenticated user. */
    @observable
    authUsername: string = null;

    /** Root level application model. */
    appModel: HoistAppModel = null;

    /** Specifications for this application, provided in call to `XH.renderApp()`. */
    appSpec: AppSpec = null;

    /** Main entry point. Initialize and render application code. */
    renderApp<T extends HoistAppModel>(appSpec: AppSpec<T>) {
        const spinner = document.getElementById('xh-preload-spinner');
        if (spinner) spinner.style.display = 'none';
        this.appSpec = appSpec instanceof AppSpec ? appSpec : new AppSpec(appSpec);

        const root = createRoot(document.getElementById('xh-root')),
            rootView = createElement(appSpec.containerClass, {model: this.appContainerModel});
        root.render(rootView);
    }

    /**
     * Install HoistServices on XH.
     *
     * @param serviceClasses - Classes extending HoistService
     *
     * This method will create, initialize, and install the services classes listed on XH.
     * All services will be initialized concurrently. To guarantee execution order of service
     * initialization, make multiple calls to this method with await.
     *
     * Applications must choose a unique name of the form xxxService to avoid naming collisions.
     * If naming collisions are detected, an error will be thrown.
     */
    async installServicesAsync(...serviceClasses: HoistServiceClass[]) {
        return installServicesAsync(serviceClasses);
    }

    /**
     * Transition the application state.
     * @internal
     */
    @action
    setAppState(appState: AppState) {
        if (this.appState != appState) {
            this.appState = appState;
        }
    }

    /**
     * Trigger a full reload of the current application.
     *
     * This method will reload the entire application document in the browser.
     * To simply trigger a refresh of the loadable content within the application,
     * see {@link XH.refreshAppAsync} instead.
     */
    @action
    reloadApp() {
        never().linkTo(this.appLoadModel);
        window.location.reload();
    }

    /**
     * Refresh the current application.
     *
     * This method will do an "in-place" refresh of the loadable content as defined by the app.
     * It is a short-cut to `XH.refreshContextModel.refreshAsync()`.
     *
     * To trigger a full reload of the application document in the browser (including code)
     * see {@link XH.reloadApp} instead.
     */
    refreshAppAsync() {
        return this.refreshContextModel.refreshAsync();
    }

    /**
     * Tracks globally loading promises.
     * Apps should link any async operations that should mask the entire viewport to this model.
     */
    get appLoadModel(): TaskObserver {
        return this.acm.appLoadModel;
    }

    /**
     * The global RefreshContextModel for this application.
     */
    get refreshContextModel(): RefreshContextModel {
        return this.acm.refreshContextModel;
    }

    //------------------------
    // Theme Support
    //------------------------
    /** Toggle the theme between light and dark variants. */
    toggleTheme() {
        return this.acm.themeModel.toggleTheme();
    }

    /**
     * Sets the theme directly (useful for custom app option controls).
     */
    setTheme(value: Theme, persist: boolean = true) {
        return this.acm.themeModel.setTheme(value, persist);
    }

    /** Is the app currently rendering in dark theme? */
    get darkTheme(): boolean {
        return this.acm.themeModel.darkTheme;
    }

    //------------------------
    // Sizing Mode Support
    //------------------------
    setSizingMode(sizingMode: SizingMode) {
        return this.acm.sizingModeModel.setSizingMode(sizingMode);
    }

    get sizingMode(): SizingMode {
        return this.acm.sizingModeModel.sizingMode;
    }

    //------------------------
    // Viewport Size
    //------------------------
    /** Current viewport width / height. (observable) */
    get viewportSize(): {width: number, height: number} {
        return this.acm.viewportSizeModel.size;
    }

    /** Is the viewport in portrait orientation? (observable) */
    get isPortrait(): boolean {
        return this.acm.viewportSizeModel.isPortrait;
    }

    /** Is the viewport in landscape orientation? (observable) */
    get isLandscape(): boolean {
        return this.acm.viewportSizeModel.isLandscape;
    }

    //-------------------------
    // Routing support
    //-------------------------
    /**
     * Underlying Router5 Router object implementing the routing state.
     * Applications should use this property to directly access the Router5 API.
     */
    get router() {
        return this.routerModel.router;
    }

    /**
     * The current routing state as an observable property.
     * @see RoutingManager.currentState
     */
    get routerState() {
        return this.routerModel.currentState;
    }

    /** Route the app - shortcut to this.router.navigate. */
    navigate(...args) {
        // @ts-ignore
        return this.router.navigate(...args);
    }

    /** Add a routeName to the current route, preserving params */
    appendRoute(routeName: string, newParams?: PlainObject) {
        return this.routerModel.appendRoute(routeName, newParams);
    }

    /** Remove last routeName from the current route, preserving params */
    popRoute() {
        return this.routerModel.popRoute();
    }

    //------------------------------
    // Message Support
    //------------------------------
    /**
     * Show a modal message dialog.
     *
     * Note that this method will autofocus the confirm button by default. To focus the cancel
     * button instead (e.g. for confirming risky operations), applications should specify a
     * `cancelProps` argument of the following form `cancelProps: {..., autoFocus: true}`.
     *
     * @returns true if user confirms, false if user cancels. If an input is provided, the
     * Promise will resolve to the input value if user confirms.
     */
    message(config: MessageSpec): Promise<any> {
        return this.acm.messageSourceModel.message(config);
    }

    /**
     * Show a modal 'alert' dialog with message and default 'OK' button.
     * @returns true when user acknowledges alert.
     */
    alert(config: MessageSpec): Promise<boolean> {
        return this.acm.messageSourceModel.alert(config);
    }

    /**
     * Show a modal 'confirm' dialog with message and default 'OK'/'Cancel' buttons.
     * @returns true if user confirms, false if user cancels.
     */
    confirm(config: MessageSpec): Promise<boolean> {
        return this.acm.messageSourceModel.confirm(config);
    }

    /**
     * Show a modal 'prompt' dialog with a default TextInput, message and 'OK'/'Cancel' buttons.
     *
     * The default TextInput comes with props set for:
     *   1. autoFocus = true
     *   2. selectOnFocus = true (desktop only)
     *   3. onKeyDown handler to confirm on <enter> (same as clicking 'OK') (desktop only)
     * Applications may also provide a custom HoistInput, in which all props must be set.
     *
     * @returns value of input if user confirms, false if user cancels.
     */
    prompt(config: MessageSpec): Promise<any> {
        return this.acm.messageSourceModel.prompt(config);
    }

    /**
     * Show a non-modal "toast" notification that appears and then automatically dismisses.
     * @returns model representing the toast. May be used for programmatic dismissal.
     */
    toast(config: ToastSpec|string): ToastModel {
        return this.acm.toastSourceModel.show(config);
    }

    /**
     * Show a toast with default intent and icon indicating success.
     */
    successToast(config: ToastSpec|string): ToastModel {
        if (isString(config)) config = {message: config};
        return this.toast({intent: 'success', icon: Icon.success(), ...config});
    }

    /**
     * Show a toast with default intent and icon indicating a warning.
     */
    warningToast(config: ToastSpec|string): ToastModel {
        if (isString(config)) config = {message: config};
        return this.toast({intent: 'warning', icon: Icon.warning(), ...config});
    }

    /**
     * Show a toast with intent and icon indicating a serious issue.
     */
    dangerToast(config: ToastSpec|string): ToastModel {
        if (isString(config)) config = {message: config};
        return this.toast({intent: 'danger', icon: Icon.danger(), ...config});
    }

    /**
     * Show a Banner across the top of the viewport. Banners are unique by their
     * category prop - showing a new banner with an existing category will replace it.
     */
    showBanner(config: BannerSpec|string): BannerModel {
        if (isString(config)) config = {message: config};
        return this.acm.bannerSourceModel.show(config);
    }

    /**
     * Hide banner by category name.
     */
    hideBanner(category: string = 'default') {
        return this.acm.bannerSourceModel.hide(category);
    }

    //--------------------------
    // Exception Support
    //--------------------------
    /**
     * Handle an exception. This method is an alias for {@link ExceptionHandler.handleException}.
     *
     * This method may be called by applications in order to provide logging, reporting, and
     * display of exceptions. It is typically called directly in catch() blocks.
     *
     * See also Promise.catchDefault(). That method will delegate its arguments to this method
     * and provides a more convenient interface for catching exceptions in Promise chains.
     *
     * @param exception - Error or thrown object - if not an Error, an Exception will be created
     *      via `Exception.create()`.
     * @param options - provides further control over how the exception is shown and/or logged.
     */
    handleException(exception: Error|PlainObject|string, options?: ExceptionHandlerOptions) {
        this.exceptionHandler.handleException(exception, options);
    }

    /**
     * Show an exception. This method is an alias for {@link ExceptionHandler.showException}.
     *
     * Intended to be used for the deferred / user-initiated showing of exceptions that have
     * already been appropriately logged. Applications should typically prefer `handleException`.
     *
     * @param exception - Error or thrown object - if not an Error, an Exception will be created
     *      via `Exception.create()`.
     * @param options - provides further control over how the exception is shown and/or logged.
     */
    showException(exception: Error|PlainObject|string, options?: ExceptionHandlerOptions) {
        this.exceptionHandler.showException(exception, options);
    }

    /**
     * Create a new exception - See {@link Exception} for Hoist extensions to JS Errors.
     * @param cfg - properties to add to the returned Error. If a string, will be the `message`.
     */
    exception(cfg: PlainObject|string): Error {
        return Exception.create(cfg);
    }

    //---------------------------
    // Miscellaneous
    //---------------------------
    /** Show "about this app" dialog, powered by {@link EnvironmentService}. */
    showAboutDialog() {
        this.acm.aboutDialogModel.show();
    }

    /** Show a "release notes" dialog, powered by {@link ChangelogService}. */
    showChangelog() {
        this.acm.changelogDialogModel.show();
    }

    /**
     * Show a dialog to elicit feedback from the user.
     * @param message - optional message to preset within the feedback dialog.
     */
    showFeedbackDialog({message}: {message?: string} = {}) {
        this.acm.feedbackDialogModel.show({message});
    }

    /** Show the impersonation bar to allow switching users. */
    showImpersonationBar() {
        this.acm.impersonationBarModel.show();
    }

    /** Show a dialog to allow the user to view and set app options. */
    showOptionsDialog() {
        this.acm.optionsDialogModel.show();
    }

    //---------------------------
    // Miscellaneous
    //---------------------------
    /**
     * Return a collection of Models currently 'active' in this application.
     *
     * This will include all models that have not had `destroy()`
     * called on them.  Models will be returned in creation order.
     */
    getActiveModels(selector: ModelSelector = '*'): HoistModel[] {
        const ret = [];
        instanceManager.models.forEach(m => {
            if (m.matchesSelector(selector, true)) ret.push(m);
        });
        return ret;
    }

    /** All services registered with this application. */
    getServices(): HoistService[] {
        return Array.from(instanceManager.services);
    }

    /** All Stores registered with this application. */
    getStores(): Store[] {
        return Array.from(instanceManager.stores);
    }

    /**
     * Resets user preferences and any persistent local application state, then reloads the app.
     */
    async restoreDefaultsAsync() {
        await this.appModel.restoreDefaultsAsync();
        this.reloadApp();
    }

    /**
     * Helper method to destroy resources safely (e.g. child HoistModels). Will quietly skip args
     * that are null / undefined or that do not implement destroy().
     *
     * @param args - objects to be destroyed. If any argument is an array,
     *      each element in the array will be destroyed (this is *not* done recursively);.
     */
    safeDestroy(...args: (any|any[])[]) {
        if (args) {
            args = flatten(args);
            args.forEach(it => {
                it?.destroy?.();
            });
        }
    }

    /**
     * Generate an ID string, unique within this run of the client application and suitable
     * for local-to-client uses such as auto-generated store record identifiers.
     *
     * Deliberately *not* intended to be globally unique, suitable for reuse, or to appear as such.
     */
    genId(): string {
        return uniqueId('xh-id-');
    }

    //---------------------------------
    // Framework Methods
    //---------------------------------
    /**
     * Called when application container first mounted in order to trigger initial
     * authentication and initialization of framework and application.
     * @internal
     */
    async initAsync() {
        // Avoid multiple calls, which can occur if AppContainer remounted.
        if (this._initCalled) return;
        this._initCalled = true;

        const {appSpec, isMobileApp, isPhone, isTablet, isDesktop, baseUrl} = this;

        if (appSpec.trackAppLoad) this.trackLoad();

        // Add xh css classes to power Hoist CSS selectors.
        document.body.classList.add(...compact([
            'xh-app',
            (isMobileApp ? 'xh-mobile' : 'xh-standard'),
            (isDesktop ? 'xh-desktop' : null),
            (isPhone ? 'xh-phone' : null),
            (isTablet ? 'xh-tablet' : null)
        ]));

        this.createActivityListeners();

        // Disable browser context menu on long-press, used to show (app) context menus and as an
        // alternate gesture for tree grid drill-own.
        if (isMobileApp) {
            window.addEventListener('contextmenu', e => e.preventDefault(), {capture: true});
        }

        try {
            await this.installServicesAsync(FetchService);
            await this.installServicesAsync(TrackService);

            // pre-flight allows clean recognition when we have no server.
            try {
                await XH.fetch({url: 'ping'});
            } catch (e) {
                const pingURL = baseUrl.startsWith('http') ?
                    `${baseUrl}ping` :
                    `${window.location.origin}${baseUrl}ping`;

                throw this.exception({
                    name: 'UI Server Unavailable',
                    detail: e.message,
                    message: 'Client cannot reach UI server.  Please check UI server at the ' +
                        `following location: ${pingURL}`
                });
            }

            this.setAppState('PRE_AUTH');

            // consult (optional) pre-auth init for app
            const modelClass: any  = this.appSpec.modelClass;
            await modelClass.preAuthAsync();

            // Check if user has already been authenticated (prior login, OAuth, SSO)...
            const userIsAuthenticated = await this.getAuthStatusFromServerAsync();

            // ...if not, throw in SSO mode (unexpected error case) or trigger a login prompt.
            if (!userIsAuthenticated) {
                throwIf(
                    appSpec.isSSO,
                    'Unable to complete required authentication (SSO/Oauth failure).'
                );
                this.setAppState('LOGIN_REQUIRED');
                return;
            }

            // ...if so, continue with initialization.
            await this.completeInitAsync();

        } catch (e) {
            this.setAppState('LOAD_FAILED');
            this.handleException(e, {requireReload: true});
        }
    }

    /**
     * Complete initialization. Called after the client has confirmed that the user is generally
     * authenticated and known to the server (regardless of application roles at this point).
     * @internal
     */
    @action
    async completeInitAsync() {
        try {

            // Install identity service and confirm access
            await this.installServicesAsync(IdentityService);
            const access = this.checkAccess();
            if (!access.hasAccess) {
                this.accessDeniedMessage = access.message || 'Access denied.';
                this.setAppState('ACCESS_DENIED');
                return;
            }

            // Complete initialization process
            this.setAppState('INITIALIZING');
            await this.installServicesAsync(LocalStorageService);
            await this.installServicesAsync(
                EnvironmentService, PrefService, ConfigService, JsonBlobService
            );

            // Confirm hoist-core version after environment service loaded
            const hcVersion = XH.environmentService.get('hoistCoreVersion');
            if (!checkMinVersion(hcVersion, MIN_HOIST_CORE_VERSION)) {
                throw XH.exception(`
                    This version of Hoist React requires the server to run Hoist Core
                    v${MIN_HOIST_CORE_VERSION} or greater. Version ${hcVersion} detected.
                `);
            }

            await this.installServicesAsync(
                AlertBannerService, AutoRefreshService, ChangelogService, IdleService,
                InspectorService, GridAutosizeService, GridExportService, WebSocketService
            );
            this.acm.init();

            this.setDocTitle();

            // Delay to workaround hot-reload styling issues in dev.
            await wait(XH.isDevelopmentMode ? 300 : 1);

            const modelClass:any  = this.appSpec.modelClass;
            this.appModel = modelClass.instance =  new modelClass();
            await this.appModel.initAsync();
            this.startRouter();
            this.startOptionsDialog();
            this.setAppState('RUNNING');
        } catch (e) {
            this.setAppState('LOAD_FAILED');
            this.handleException(e, {requireReload: true});
        }
    }

    /**
     * Suspend all app activity and display, including timers and web sockets.
     *
     * Suspension is a terminal state, requiring user to reload the app.
     * Used for idling, forced version upgrades, and ad-hoc killing of problematic clients.
     * @internal
     */
    suspendApp(suspendData) {
        if (XH.appState === 'SUSPENDED') return;
        this.suspendData = suspendData;
        XH.setAppState('SUSPENDED');
        XH.webSocketService.shutdown();
        Timer.cancelAll();
    }

    //------------------------
    // Implementation
    //------------------------
    private checkAccess(): any {
        const user = XH.getUser(),
            {checkAccess} = this.appSpec;

        if (isString(checkAccess)) {
            return user.hasRole(checkAccess) ?
                {hasAccess: true} :
                {
                    hasAccess: false,
                    message: `User needs the role "${checkAccess}" to access this application.`
                };
        } else {
            const ret = checkAccess(user);
            return isBoolean(ret) ? {hasAccess: ret} : ret;
        }
    }

    private setDocTitle() {
        const env = XH.getEnv('appEnvironment'),
            {clientAppName} = this.appSpec;
        document.title = (env === 'Production' ? clientAppName : `${clientAppName} (${env})`);
    }

    private async getAuthStatusFromServerAsync(): Promise<boolean> {
        return await this.fetchService
            .fetchJson({
                url: 'xh/authStatus',
                timeout: 3 * MINUTES     // Accommodate delay for user at a credentials prompt
            })
            .then(r => r.authenticated)
            .catch(e => {
                // 401s normal / expected for non-SSO apps when user not yet logged in.
                if (e.httpStatus === 401) return false;
                // Other exceptions indicate e.g. connectivity issue, server down - raise to user.
                throw e;
            });
    }

    private startRouter() {
        this.routerModel.addRoutes(this.appModel.getRoutes());
        this.router.start();
    }

    private startOptionsDialog() {
        this.acm.optionsDialogModel.setOptions(this.appModel.getAppOptions());
    }

    private get acm(): AppContainerModel {
        return this.appContainerModel;
    }

    private trackLoad() {
        let loadStarted = window['_xhLoadTimestamp'], // set in index.html
            loginStarted = null,
            loginElapsed = 0;

        const disposer = mobxReaction(
            () => this.appState,
            (state) => {
                const now = Date.now();
                switch (state) {
                    case 'RUNNING':
                        XH.track({
                            category: 'App',
                            message: `Loaded ${this.clientAppCode}`,
                            elapsed: now - loadStarted - loginElapsed,
                            data: {
                                appVersion: this.appVersion,
                                appBuild: this.appBuild,
                                locationHref: window.location.href,
                                ...getClientDeviceInfo()
                            }
                        });
                        disposer();
                        break;

                    case 'LOGIN_REQUIRED':
                        loginStarted = now;
                        break;
                    default:
                        if (loginStarted) loginElapsed = now - loginStarted;
                }
            }
        );
    }

    private createActivityListeners() {
        ['keydown', 'mousemove', 'mousedown', 'scroll', 'touchmove', 'touchstart'].forEach(name => {
            window.addEventListener(name, () => {
                this._lastActivityMs = Date.now();
            });
        });
    }

    private get uaParser() {
        if (!this._uaParser) this._uaParser = new parser();
        return this._uaParser;
    }

    private parseAppSpec() {

    }


}

/** app-wide singleton instance. */
export const XH: XHClass = new XHClass();

// Install reference to XH singleton on window (this is the one global Hoist adds directly).
// Note that app code should still `import {XH} from '@xh/hoist/core'` to access this instance.
window['XH'] = XH;


