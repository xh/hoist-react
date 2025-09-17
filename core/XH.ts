/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {RouterModel} from '@xh/hoist/appcontainer/RouterModel';
import {HoistAuthModel} from '@xh/hoist/core/HoistAuthModel';
import {Store} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {action} from '@xh/hoist/mobx';
import {never} from '@xh/hoist/promise';
import {
    AlertBannerService,
    AutoRefreshService,
    ChangelogService,
    ConfigService,
    EnvironmentService,
    FetchOptions,
    FetchService,
    GridAutosizeService,
    GridExportService,
    IdentityService,
    IdleService,
    InspectorService,
    JsonBlobService,
    LocalStorageService,
    PrefService,
    SessionStorageService,
    TrackService,
    WebSocketService,
    ClientHealthService
} from '@xh/hoist/svc';
import {getLogLevel, setLogLevel, type LogLevel} from '@xh/hoist/utils/log';
import {camelCase, flatten, isString, uniqueId} from 'lodash';
import {Router, State} from 'router5';
import {CancelFn} from 'router5/types/types/base';
import {SetOptional} from 'type-fest';
import {AppContainerModel} from '../appcontainer/AppContainerModel';
import {BannerModel} from '../appcontainer/BannerModel';
import {ToastModel} from '../appcontainer/ToastModel';
import '../styles/XH.scss';
import {
    AppSpec,
    AppState,
    AppSuspendData,
    BannerSpec,
    Exception,
    ExceptionHandler,
    ExceptionHandlerOptions,
    HoistAppModel,
    HoistException,
    HoistService,
    HoistServiceClass,
    HoistUser,
    MessageSpec,
    PageState,
    PlainObject,
    ReloadAppOptions,
    SizingMode,
    TaskObserver,
    Theme,
    ToastSpec,
    TrackOptions
} from './';
import {installServicesAsync} from './impl/InstallServices';
import {instanceManager} from './impl/InstanceManager';
import {HoistModel, ModelSelector, RefreshContextModel} from './model';
import ShortUniqueId from 'short-unique-id';

export const MIN_HOIST_CORE_VERSION = '31.2';

declare const xhAppCode: string;
declare const xhAppName: string;
declare const xhAppVersion: string;
declare const xhAppBuild: string;
declare const xhBaseUrl: string;
declare const xhClientApps: string[];
declare const xhIsDevelopmentMode: boolean;

/**
 * Top-level Singleton model for Hoist. This is the main entry point for the API.
 *
 * Provides access to the built-in Hoist services, metadata about the application and environment,
 * and convenience aliases to the most common framework operations.
 *
 * Available via import as `XH` - also installed as `window.XH` for troubleshooting purposes.
 */
export class XHApi {
    /** Unique id for this loaded instance of the app.  Unique for every refresh of document. */
    loadId: string = this.genLoadId();

    /**
     * Unique id for this browser tab/window on this domain.
     * Corresponds to the scope of the built-in sessionStorage object.
     */
    tabId: string = this.genTabId();

    //--------------------------
    // Implementation Delegates
    //--------------------------
    /** Core implementation model hosting all application state. */
    appContainerModel: AppContainerModel = new AppContainerModel();

    /** Provider of centralized exception handling for the app. */
    exceptionHandler: ExceptionHandler = new ExceptionHandler();

    //----------------------------------------------------------------------------------------------
    // Metadata - the `xhXXX` values on the right hand of these assignments are injected at build
    // time via webpack.DefinePlugin. See @xh/hoist-dev-utils/configureWebpack.js.
    //----------------------------------------------------------------------------------------------
    /** Short internal code for the application. */
    readonly appCode: string = xhAppCode;

    /** User-facing display name for the app. See also {@link clientAppName}. */
    readonly appName: string = xhAppName;

    /** SemVer or snapshot version of the client build. */
    readonly appVersion: string = xhAppVersion;

    /**
     * Optional identifier for the client build (e.g. a git commit hash or a build ID).
     * Varies depending on an app's particular build configuration.
     */
    readonly appBuild: string = xhAppBuild;

    /** Root URL context/path - prepended to all relative fetch requests. */
    readonly baseUrl: string = xhBaseUrl;

    /** List of all client app codes available in the application. */
    readonly clientApps: string[] = xhClientApps;

    /** True if the app is running in a local development environment. */
    readonly isDevelopmentMode: boolean = xhIsDevelopmentMode;

    /** Authentication Model for this App. */
    authModel: HoistAuthModel;

    //----------------------------------------------------------------------------------------------
    // Hoist Core Services
    // Singleton instances of each are created and installed within AppContainerModel.initAsync().
    //----------------------------------------------------------------------------------------------
    alertBannerService: AlertBannerService;
    autoRefreshService: AutoRefreshService;
    changelogService: ChangelogService;
    clientHealthService: ClientHealthService;
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
    sessionStorageService: SessionStorageService;
    trackService: TrackService;
    webSocketService: WebSocketService;

    //----------------------------
    // Immutable Getters
    //----------------------------
    /**
     * Tracks globally loading promises.
     * Apps should link any async operations that should mask the entire viewport to this model.
     */
    get appLoadModel(): TaskObserver {
        return this.acm.appLoadModel;
    }

    /** Root level application model. */
    get appModel(): HoistAppModel {
        return this.acm.appModel;
    }

    /** Specifications for this application, provided in call to `XH.renderApp()`. */
    get appSpec(): AppSpec {
        return this.acm.appSpec;
    }

    /** Short code for this particular JS client application. */
    get clientAppCode(): string {
        return this.appSpec.clientAppCode;
    }

    /** Display name for this particular JS client application. */
    get clientAppName(): string {
        return this.appSpec.clientAppName;
    }

    /** True if the app should use the Hoist mobile toolkit.*/
    get isMobileApp(): boolean {
        return this.appSpec.isMobileApp;
    }

    /** True if the app is running on a desktop. */
    get isDesktop(): boolean {
        return this.acm.userAgentModel.isDesktop;
    }

    /** True if the app is running on a mobile phone. */
    get isPhone(): boolean {
        return this.acm.userAgentModel.isPhone;
    }

    /** True if the app is running on a tablet. */
    get isTablet(): boolean {
        return this.acm.userAgentModel.isTablet;
    }

    /** The global RefreshContextModel for this application.*/
    get refreshContextModel(): RefreshContextModel {
        return this.acm.refreshContextModel;
    }

    //-------------------
    // State Getters
    //-------------------
    /**
     * Current lifecycle state of the application. (observable)
     * The {@link AppState} type lists the possible states, with descriptive comments.
     */
    get appState(): AppState {
        return this.acm.appStateModel.state;
    }

    /** Shortcut for testing if appState is 'RUNNING'. (observable) */
    get appIsRunning(): boolean {
        return this.appState === 'RUNNING';
    }

    /** Milliseconds timestamp for the last time user interaction with the page was detected. */
    get lastActivityMs(): number {
        return this.acm.appStateModel.lastActivityMs;
    }

    /**
     * The lifecycle state of the page. (observable)
     *
     * This state changes due to changes to the focused/visible state of the browser tab and the
     * browser window as a whole, as well as built-in browser behaviors around navigation and
     * performance optimizations.
     *
     * Apps can react to this stat to pause background processes (e.g. expensive refreshes) when
     * the app is no longer visible to the user and resume them when the user switches back and
     * re-activates the tab.
     *
     * The {@link PageState} type lists the possible states, with descriptive comments.
     * See {@link https://developer.chrome.com/blog/page-lifecycle-api/} for a useful overview.
     */
    get pageState(): PageState {
        return this.acm.pageStateModel.state;
    }

    /** Shortcut for testing if pageState is 'active'. (observable) */
    get pageIsActive(): boolean {
        return this.pageState === 'active';
    }

    /** Shortcut for testing if pageState is 'passive'. (observable) */
    get pageIsPassive(): boolean {
        return this.pageState === 'passive';
    }

    /** Shortcut for testing if pageState is 'active' or 'passive'. (observable) */
    get pageIsVisible(): boolean {
        return this.pageIsActive || this.pageIsPassive;
    }

    //----------------------------------------
    // Delegating methods
    //----------------------------------------
    /**
     * Send a request via the underlying fetch API.
     * @see FetchService.fetch
     */
    fetch(opts: FetchOptions): Promise<any> {
        return this.fetchService.fetch(opts);
    }

    /**
     * Send an HTTP request and decode the response as JSON.
     * @see FetchService.fetchJson
     */
    fetchJson(opts: FetchOptions): Promise<any> {
        return this.fetchService.fetchJson(opts);
    }

    /**
     * Send a POST request with a JSON body and decode the response as JSON.
     * @see FetchService.postJson
     */
    postJson(opts: FetchOptions): Promise<any> {
        return this.fetchService.postJson(opts);
    }

    /**
     * Read soft configuration values.
     * @see ConfigService.get
     */
    getConf(key: string, defaultVal?: any): any {
        return this.configService.get(key, defaultVal);
    }

    /**
     * Read user preference values.
     * @see PrefService.get
     */
    getPref(key: string, defaultVal?: any): any {
        return this.prefService.get(key, defaultVal);
    }

    /**
     * Set user preference values.
     * @see PrefService.set
     */
    setPref(key: string, val: any) {
        return this.prefService.set(key, val);
    }

    /**
     * Track user activity.
     * @see TrackService.track
     */
    track(opts: string | TrackOptions) {
        return this.trackService?.track(opts);
    }

    /**
     * Read an environment property.
     * @see EnvironmentService.get
     */
    getEnv(key: string): any {
        return this.environmentService?.get(key) ?? null;
    }

    /**
     * @returns the current acting user.
     * @see IdentityService.user
     */
    getUser(): HoistUser {
        return this.identityService?.user ?? null;
    }

    /**
     * @returns the current acting user's username.
     * @see IdentityService.username
     */
    getUsername(): string {
        return this.identityService?.username ?? null;
    }

    /**
     * Logout the current user.
     * @see HoistAuthModel.logoutAsync
     */
    async logoutAsync(): Promise<void> {
        await this.authModel?.logoutAsync();
        this.reloadApp();
    }

    /**
     * Current minimum severity for Hoist log utils (default 'info').
     * Messages logged via managed Hoist log utils with lower severity will be ignored.
     */
    get logLevel(): LogLevel {
        return getLogLevel();
    }

    /**
     * Set the minimum severity for Hoist log utils until the page is refreshed. Optionally persist
     * this adjustment to sessionStorage to maintain for the lifetime of the browser tab.
     *
     * Hint: call this method from the console to adjust your app's log level while troubleshooting.
     */
    setLogLevel(level: LogLevel, persistInSessionStorage: boolean = false) {
        setLogLevel(level, persistInSessionStorage);
    }

    //----------------------
    // App lifecycle support
    //----------------------
    /**
     * Main entry point to start the client app - initializes and renders application code.
     * Call from the app's entry-point file within your project's `/client-app/src/apps/` folder.
     */
    renderApp<T extends HoistAppModel>(appSpec: AppSpec<T>) {
        this.acm.renderApp(appSpec);
    }

    /**
     * Entry-point to start the Hoist Admin console app, with common properties defaulted.
     * Call this from within your project's `/client-app/src/apps/admin.ts` file.
     *
     * NOTE you must still import and pass in the `componentClass`, `containerClass`, and
     * `modelClass` options. We don't default those here, as we do not want to import admin-only
     * code in XH, where it would be added to the bundles for all client apps.
     */
    renderAdminApp<T extends HoistAppModel>(
        appSpec: SetOptional<AppSpec<T>, 'isMobileApp' | 'checkAccess'>
    ) {
        this.acm.renderApp({
            clientAppCode: 'admin',
            clientAppName: `${this.appName} Admin`,
            isMobileApp: false,
            checkAccess: 'HOIST_ADMIN_READER',
            ...appSpec
        });
    }

    /**
     * Suspend all app activity and display, including timers and web sockets.
     *
     * Suspension is a terminal state, requiring user to reload the app.
     * Used for idling, forced version upgrades, and ad-hoc killing of problematic clients.
     */
    suspendApp(suspendData: AppSuspendData) {
        this.acm.appStateModel.suspendApp(suspendData);
    }

    /**
     * Trigger a full reload of the current application.
     *
     * @param opts - options to govern reload. To support legacy usages, a provided
     *       string will be treated as `ReloadAppOptions.path`.
     *
     * This method will reload the entire application document in the browser - to trigger a
     * refresh of the loadable content within the app, use {@link refreshAppAsync} instead.
     */
    @action
    reloadApp(opts?: ReloadAppOptions | string) {
        never().linkTo(this.appLoadModel);

        opts = isString(opts) ? {path: opts} : (opts ?? {});

        const {location} = window,
            href = opts.path
                ? `${location.origin}/${opts.path.replace(/^\/+/, '')}`
                : location.href,
            url = new URL(href);

        if (opts.removeQueryParams) url.search = '';
        // Add a unique query param to force a full reload without using the browser cache.
        url.searchParams.set('xhCacheBuster', Date.now().toString());
        document.location.assign(url);
    }

    /**
     * Refresh the current application.
     *
     * This method will do an "in-place" refresh of the loadable content as defined by the app.
     * It is a short-cut to `XH.refreshContextModel.refreshAsync()`.
     *
     * To trigger a full reload of the app document in the browser (including code) use
     * {@link reloadApp} instead.
     */
    refreshAppAsync() {
        return this.refreshContextModel.refreshAsync();
    }

    /**
     * Open a url in an external browser window/tab.
     *
     * Unlike a simple call to `open`, this method ensures the "opener" method on the
     * new window is null. This ensures that the new page will not share sessionState with
     * this page.  See https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
     */
    openWindow(url: string, target?: string) {
        window.open(url, target ?? '_blank', 'noopener=true');
    }

    /**
     * Flags for controlling experimental, hotfix, or otherwise provisional features.
     *
     * Configure via `xhFlags` config.
     *
     * No flags currently supported (subject to changes without API notice):
     */
    get flags(): PlainObject {
        return XH.getConf('xhFlags', {});
    }

    //------------------------
    // Theme Support
    //------------------------
    /** Toggle the theme between light and dark variants. */
    toggleTheme() {
        return this.acm.themeModel.toggleTheme();
    }

    /** Set the theme directly (useful for custom app option controls). */
    setTheme(value: Theme, persist: boolean = true) {
        return this.acm.themeModel.setTheme(value, persist);
    }

    /** True if the dark theme is currently active. (observable) */
    get darkTheme(): boolean {
        return this.acm.themeModel.darkTheme;
    }

    //------------------------
    // Sizing Mode Support
    //------------------------
    /** Standard size used by Grid. (observable) */
    get sizingMode(): SizingMode {
        return this.acm.sizingModeModel.sizingMode;
    }

    /** Set standard size used by Grid. */
    setSizingMode(sizingMode: SizingMode) {
        return this.acm.sizingModeModel.setSizingMode(sizingMode);
    }

    //------------------------
    // Viewport Size
    //------------------------
    /** Current viewport width / height. (observable) */
    get viewportSize(): {width: number; height: number} {
        return this.acm.viewportSizeModel.size;
    }

    /** True if the viewport is currently in the portrait orientation. (observable) */
    get isPortrait(): boolean {
        return this.acm.viewportSizeModel.isPortrait;
    }

    /** True if the viewport is currently in the landscape orientation. (observable) */
    get isLandscape(): boolean {
        return this.acm.viewportSizeModel.isLandscape;
    }

    //-------------------------
    // Routing support
    //-------------------------
    /**
     * Model hosting observable router5 state. Not typically used by applications.
     * Use {@link routerState} instead.
     */
    get routerModel(): RouterModel {
        return this.acm.routerModel;
    }

    /**
     * Underlying Router5 Router object implementing the routing state.
     * Applications should use this property to directly access the Router5 API.
     */
    get router(): Router {
        return this.routerModel.router;
    }

    /**
     * The current routing state of the application. (observable)
     * @see RoutingManager.currentState
     */
    get routerState(): State {
        return this.routerModel.currentState;
    }

    /** Route the app - shortcut to `XH.router.navigate()`. */
    navigate(...args): CancelFn {
        // @ts-ignore
        return this.router.navigate(...args);
    }

    /** Add a routeName to the current route, preserving params. */
    appendRoute(routeName: string, newParams?: PlainObject): CancelFn {
        return this.routerModel.appendRoute(routeName, newParams);
    }

    /** Remove last routeName from the current route, preserving params. */
    popRoute(): CancelFn {
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
     * returned Promise will resolve to the input value if user confirms, false if user cancels.
     */
    message<T = unknown>(config: MessageSpec): Promise<T | boolean> {
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
    prompt<T = unknown>(config: MessageSpec): Promise<T | false> {
        return this.acm.messageSourceModel.prompt(config);
    }

    /**
     * Show a non-modal "toast" notification that appears and then automatically dismisses.
     * @returns model representing the toast. May be used for programmatic dismissal.
     */
    toast(config: ToastSpec | string): ToastModel {
        return this.acm.toastSourceModel.show(config);
    }

    /** Show a toast with default intent and icon indicating success. */
    successToast(config: ToastSpec | string): ToastModel {
        if (isString(config)) config = {message: config};
        return this.toast({intent: 'success', icon: Icon.success(), ...config});
    }

    /** Show a toast with default intent and icon indicating a warning. */
    warningToast(config: ToastSpec | string): ToastModel {
        if (isString(config)) config = {message: config};
        return this.toast({intent: 'warning', icon: Icon.warning(), ...config});
    }

    /** Show a toast with intent and icon indicating a serious issue. */
    dangerToast(config: ToastSpec | string): ToastModel {
        if (isString(config)) config = {message: config};
        return this.toast({intent: 'danger', icon: Icon.danger(), ...config});
    }

    /**
     * Show a Banner across the top of the viewport. Banners are unique by their category prop.
     * Showing a new banner with an existing category name will replace the previous banner.
     */
    showBanner(spec: BannerSpec | string): BannerModel {
        if (isString(spec)) spec = {message: spec};
        return this.acm.bannerSourceModel.show(spec);
    }

    /** Hide banner by category name. */
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
     * @param exception - thrown object, will be coerced into a {@link HoistException}.
     * @param options - provides further control over how the exception is shown and/or logged.
     */
    handleException(exception: unknown, options?: ExceptionHandlerOptions) {
        this.exceptionHandler.handleException(exception, options);
    }

    /**
     * Create a new exception - See {@link Exception}.
     *
     * @param src - if a native JS Error, it will be enhanced into a `HoistException` and returned.
     *      If a plain object, all properties will be set on a new `HoistException`.
     *      Other inputs will be treated as the `message` of a new `HoistException`.
     */
    exception(src: unknown): HoistException {
        return Exception.create(src);
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

    /** Show the impersonation bar to allow an authorized admin to switch between users. */
    showImpersonationBar() {
        this.acm.impersonationBarModel.show();
    }

    /** Show a dialog to allow the user to view and set app options. */
    showOptionsDialog() {
        this.acm.optionsDialogModel.show();
    }

    /** Get a reference to a singleton service by camel case name. */
    getService(name: string): HoistService;

    /** Get a reference to a singleton service by full class. */
    getService<T extends HoistService>(cls: HoistServiceClass<T>): T;

    /** Get a reference to a singleton service. */
    getService(arg: any) {
        const name = isString(arg) ? arg : camelCase(arg.name);
        return this[name];
    }

    /**
     * Install HoistServices on 'XH'.
     *
     * This method will create, initialize, and install the provided services classes on `XH`.
     * All services will be initialized concurrently. To guarantee execution order of service
     * initialization, make multiple calls to this method with `await`.
     *
     * Applications must choose a unique name of the form xxxService to avoid naming collisions.
     * If naming collisions are detected, an error will be thrown.
     *
     * @param serviceClasses - classes extending HoistService
     */
    async installServicesAsync(...serviceClasses: HoistServiceClass[]) {
        return installServicesAsync(serviceClasses);
    }

    /**
     * Get a collection of Models currently 'active' in the app, returned in creation-time order.
     * This will include all models that have not yet had `destroy()` called on them.
     */
    getModels<T extends HoistModel>(selector: ModelSelector = '*'): T[] {
        const ret = [];
        instanceManager.models.forEach(m => {
            if (m.matchesSelector(selector, true)) ret.push(m);
        });
        return ret;
    }

    /** Get the first active model that matches the given selector, or null if none found. */
    getModel<T extends HoistModel>(selector: ModelSelector = '*'): T {
        for (let m of instanceManager.models) {
            if (m.matchesSelector(selector, true)) return m as T;
        }
        return null;
    }

    /**
     * Get the first active model that has been assigned the given testId, or null if none found.
     * Note that a small subset of models are automatically assigned the testId of their component.
     * @see InstanceManager.testSupportedModels
     */
    getModelByTestId<T extends HoistModel>(testId: string): T {
        return instanceManager.getModelByTestId(testId) as T;
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
     * Reset user state and then reload the app.
     * @see HoistAppModel.restoreDefaultsAsync()
     */
    async restoreDefaultsAsync() {
        try {
            await this.appModel.restoreDefaultsAsync();
            XH.track({category: 'App', message: 'Restored app defaults'});
            this.reloadApp();
        } catch (e) {
            XH.handleException(e, {
                message: 'Failed to restore app defaults',
                requireReload: true
            });
        }
    }

    /**
     * Helper method to destroy resources safely (e.g. child HoistModels). Will quietly skip args
     * that are null / undefined or that do not implement destroy().
     *
     * @param args - objects to be destroyed. If any argument is an array, each top-level element
     *      in the array will be destroyed. (Note this is *not* done recursively.)
     */
    safeDestroy(...args: (any | any[])[]) {
        if (args) {
            args = flatten(args);
            args.forEach(it => {
                it?.destroy?.();
            });
        }
    }

    /**
     * Generate an ID string, unique within this run of the client application and suitable for
     * local-to-client uses, such as auto-generated store record identifiers.
     *
     * Deliberately *not* intended to be globally unique, suitable for reuse, or to appear as such.
     */
    genId(): string {
        return uniqueId('xh-id-');
    }

    //----------------
    // Implementation
    //----------------
    private get acm(): AppContainerModel {
        return this.appContainerModel;
    }

    private genLoadId(): string {
        return new ShortUniqueId({length: 8}).rnd();
    }

    private genTabId(): string {
        let ret = window.sessionStorage?.getItem('xhTabId');
        if (!ret) {
            ret = new ShortUniqueId({length: 8}).rnd();
            window.sessionStorage?.setItem('xhTabId', ret);
        }
        return ret;
    }
}

/** The app-wide singleton instance. */
export const XH = new XHApi();

// Install reference to XH singleton on window (this is the one global Hoist adds directly).
// Note that app code should still `import {XH} from '@xh/hoist/core'` to access this instance.
window['XH'] = XH;
