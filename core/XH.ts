/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {RouterModel} from '@xh/hoist/appcontainer/RouterModel';
import {Router, State} from 'router5';
import {
    HoistService,
    AppSpec,
    AppState,
    Exception,
    ExceptionHandlerOptions,
    ExceptionHandler,
    TrackOptions,
    SizingMode,
    HoistServiceClass,
    Theme,
    PlainObject,
    HoistException,
    PageState,
    AppSuspendData,
    FetchResponse
} from './';
import {Store} from '@xh/hoist/data';
import {instanceManager} from './impl/InstanceManager';
import {installServicesAsync} from './impl/InstallServices';
import {Icon} from '@xh/hoist/icon';
import {action} from '@xh/hoist/mobx';
import {never} from '@xh/hoist/promise';
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
import {camelCase, flatten, isString, uniqueId} from 'lodash';
import {AppContainerModel} from '../appcontainer/AppContainerModel';
import {ToastModel} from '../appcontainer/ToastModel';
import {BannerModel} from '../appcontainer/BannerModel';
import '../styles/XH.scss';
import {ModelSelector, HoistModel, RefreshContextModel} from './model';
import {HoistAppModel, BannerSpec, ToastSpec, MessageSpec, HoistUser, TaskObserver} from './';
import {CancelFn} from 'router5/types/types/base';

export const MIN_HOIST_CORE_VERSION = '16.0';

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
 * and convenience aliases to the most common framework operations.
 *
 * Available via import as `XH` - also installed as `window.XH` for troubleshooting purposes.
 */
export class XHApi {
    //--------------------------
    // Implementation Delegates
    //--------------------------
    /** Core implementation model hosting all application state. */
    appContainerModel: AppContainerModel = new AppContainerModel();

    /** Provider of centralized exception handling for the app. */
    exceptionHandler: ExceptionHandler = new ExceptionHandler();

    //----------------------------------------------------------------------------------------------
    // Metadata - set via webpack.DefinePlugin at build time.
    // See @xh/hoist-dev-utils/configureWebpack.
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

    /** True if the app is running in a local development environment. */
    readonly isDevelopmentMode: boolean = xhIsDevelopmentMode;

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
    fetch(opts: FetchOptions): Promise<FetchResponse> {
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
     * This method will reload the entire application document in the browser - to trigger a
     * refresh of the loadable content within the app, use {@link refreshAppAsync} instead.
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
     * To trigger a full reload of the app document in the browser (including code) use
     * {@link reloadApp} instead.
     */
    refreshAppAsync() {
        return this.refreshContextModel.refreshAsync();
    }

    /**
     * Flags for controlling experimental, hotfix, or otherwise provisional features.
     *
     * Configure via `xhFlags` config.
     *
     * Currently supported (subject to changes without API notice):
     *
     *  - applyBigNumberWorkaround -  workaround for mysterious Chromium bug that causes
     *      BigNumber to lose precision after a certain number of invocations.
     *      See https://github.com/MikeMcl/bignumber.js/issues/354
     *      See https://bugs.chromium.org/p/v8/issues/detail?id=14271#c11
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
     * Show an exception. This method is an alias for {@link ExceptionHandler.showException}.
     *
     * Intended to be used for the deferred / user-initiated showing of exceptions that have
     * already been appropriately logged. Apps should typically prefer {@link handleException}.
     *
     * @param exception - thrown object, will be coerced into a {@link HoistException}.
     * @param options - provides further control over how the exception is shown and/or logged.
     */
    showException(exception: unknown, options?: ExceptionHandlerOptions) {
        this.exceptionHandler.showException(exception, options);
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
     * Reset user preferences and any persistent local application state, then reload the app.
     */
    async restoreDefaultsAsync() {
        await this.appModel.restoreDefaultsAsync();
        this.reloadApp();
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
}

/** The app-wide singleton instance. */
export const XH = new XHApi();

// Install reference to XH singleton on window (this is the one global Hoist adds directly).
// Note that app code should still `import {XH} from '@xh/hoist/core'` to access this instance.
window['XH'] = XH;
