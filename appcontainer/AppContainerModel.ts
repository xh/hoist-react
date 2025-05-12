/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {
    AppSpec,
    AppState,
    createElement,
    HoistAppModel,
    HoistModel,
    managed,
    RootRefreshContextModel,
    TaskObserver,
    XH
} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, when as mobxWhen} from '@xh/hoist/mobx';
import {never, wait} from '@xh/hoist/promise';
import numbro from 'numbro';
import {ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {
    AlertBannerService,
    AutoRefreshService,
    ChangelogService,
    ClientHealthService,
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
    SessionStorageService,
    TrackService,
    WebSocketService
} from '@xh/hoist/svc';
import {checkMinVersion, throwIf} from '@xh/hoist/utils/js';
import {compact, isEmpty} from 'lodash';
import {AboutDialogModel} from './AboutDialogModel';
import {BannerSourceModel} from './BannerSourceModel';
import {ChangelogDialogModel} from './ChangelogDialogModel';
import {ExceptionDialogModel} from './ExceptionDialogModel';
import {FeedbackDialogModel} from './FeedbackDialogModel';
import {ImpersonationBarModel} from './ImpersonationBarModel';
import {MessageSourceModel} from './MessageSourceModel';
import {OptionsDialogModel} from './OptionsDialogModel';
import {SizingModeModel} from './SizingModeModel';
import {ViewportSizeModel} from './ViewportSizeModel';
import {ThemeModel} from './ThemeModel';
import {ToastSourceModel} from './ToastSourceModel';
import {BannerModel} from './BannerModel';
import {UserAgentModel} from './UserAgentModel';
import {AppStateModel} from './AppStateModel';
import {PageStateModel} from './PageStateModel';
import {RouterModel} from './RouterModel';
import {installServicesAsync} from '../core/impl/InstallServices';
import {MIN_HOIST_CORE_VERSION} from '../core/XH';

/**
 * Root object for Framework GUI State.
 */
export class AppContainerModel extends HoistModel {
    private initCalled = false;

    //---------------------------------
    // Immutable Application State
    //--------------------------------
    appSpec: AppSpec = null;
    appModel: HoistAppModel = null;

    //------------
    // Sub-models
    //------------
    @managed appLoadModel = TaskObserver.trackAll();
    @managed appStateModel = new AppStateModel();
    @managed pageStateModel = new PageStateModel();
    @managed routerModel = new RouterModel();

    @managed aboutDialogModel = new AboutDialogModel();
    @managed changelogDialogModel = new ChangelogDialogModel();
    @managed exceptionDialogModel = new ExceptionDialogModel();
    @managed feedbackDialogModel = new FeedbackDialogModel();
    @managed impersonationBarModel = new ImpersonationBarModel();
    @managed optionsDialogModel = new OptionsDialogModel();

    @managed bannerSourceModel = new BannerSourceModel();
    @managed messageSourceModel = new MessageSourceModel();
    @managed toastSourceModel = new ToastSourceModel();

    @managed refreshContextModel = new RootRefreshContextModel();
    @managed sizingModeModel = new SizingModeModel();
    @managed viewportSizeModel = new ViewportSizeModel();
    @managed themeModel = new ThemeModel();
    @managed userAgentModel = new UserAgentModel();

    /**
     * Message shown on spinner while the application is in a pre-running state.
     * Update within `AppModel.initAsync()` to relay app-specific initialization status.
     */
    @bindable initializingLoadMaskMessage: ReactNode;

    /**
     * The last interactive login in the app. Hoist's security package will mark the last
     * time spent during user interactive login.
     *
     * Used by `Promise.track`, to ensure this time is not counted in any elapsed time tracking
     * for the app.
     * @internal
     */
    lastRelogin: {started: number; completed: number} = null;

    constructor() {
        super();
        makeObservable(this);
    }

    /**
     * Main entry point. Initialize and render application code.
     */
    renderApp<T extends HoistAppModel>(appSpec: AppSpec<T>) {
        // Remove the preload exception handler installed by preflight.js
        window.onerror = null;
        const spinner = document.getElementById('xh-preload-spinner');
        if (spinner) spinner.style.display = 'none';
        this.appSpec = appSpec instanceof AppSpec ? appSpec : new AppSpec(appSpec);

        const root = createRoot(document.getElementById('xh-root')),
            rootView = createElement(appSpec.containerClass, {model: this});
        root.render(rootView);
    }

    /**
     * Called when {@link AppContainer} first mounted.
     * Triggers initial authentication and initialization of Hoist and application.
     */
    async initAsync() {
        this.setAppState('PRE_AUTH');

        // Avoid bug where "Discarded" browser tabs can re-init an old version (see #3574)
        if (window.document['wasDiscarded']) {
            XH.reloadApp();
            return never();
        }

        // Avoid multiple calls, which can occur if AppContainer remounted.
        if (this.initCalled) return;
        this.initCalled = true;

        const {appSpec} = this,
            {isPhone, isTablet, isDesktop} = this.userAgentModel,
            {isMobileApp} = appSpec;

        // Add xh css classes to power Hoist CSS selectors.
        document.body.classList.add(
            ...compact([
                'xh-app',
                isMobileApp ? 'xh-mobile' : 'xh-standard',
                isDesktop ? 'xh-desktop' : null,
                isPhone ? 'xh-phone' : null,
                isTablet ? 'xh-tablet' : null
            ])
        );

        if (isMobileApp) {
            // Disable browser context menu on long-press, used to show (app) context menus and as an
            // alternate gesture for tree grid drill-own.
            window.addEventListener('contextmenu', e => e.preventDefault(), {capture: true});

            // Spec viewport-fit=cover to allow use of safe-area-inset envs for mobile styling
            // (e.g. `env(safe-area-inset-top)`). This allows us to avoid overlap with OS-level
            // controls like the iOS tab switcher, as well as to more easily set the background
            // color of the (effectively) unusable portions of the screen via
            this.setViewportContent(this.getViewportContent() + ', viewport-fit=cover');

            // Temporarily set maximum-scale=1 on orientation change to force reset Safari iOS
            // zoom level, and then remove to restore user zooming. This is a workaround for a bug
            // where Safari full-screen re-zooms on orientation change if user has *ever* zoomed.
            window.addEventListener(
                'orientationchange',
                () => {
                    const content = this.getViewportContent();
                    this.setViewportContent(content + ', maximum-scale=1');
                    setTimeout(() => this.setViewportContent(content), 0);
                },
                false
            );
        }

        try {
            await installServicesAsync([FetchService]);

            // Check auth, locking out, or showing login if possible
            this.setAppState('AUTHENTICATING');
            XH.authModel = new this.appSpec.authModelClass();
            const isAuthenticated = await XH.authModel.completeAuthAsync();
            if (!isAuthenticated) {
                throwIf(
                    !appSpec.enableLoginForm,
                    'Unable to complete required authentication (SSO/Auth failure).'
                );
                this.setAppState('LOGIN_REQUIRED');
                return;
            }
        } catch (e) {
            this.setAppState('LOAD_FAILED');
            XH.handleException(e, {requireReload: true});
            return;
        }

        // ...if made it to here, continue with initialization.
        await this.completeInitAsync();
    }

    /**
     * Complete initialization. Called after the client has confirmed that the user is generally
     * authenticated and known to the server (regardless of application roles at this point).
     */
    @action
    async completeInitAsync() {
        this.setAppState('INITIALIZING_HOIST');
        try {
            // Install identity service and confirm access
            await installServicesAsync(IdentityService);
            if (!this.appStateModel.checkAccess()) {
                this.setAppState('ACCESS_DENIED');
                return;
            }

            // Complete initialization process
            await installServicesAsync([ConfigService, LocalStorageService, SessionStorageService]);
            await installServicesAsync(TrackService);
            await installServicesAsync([EnvironmentService, PrefService, JsonBlobService]);

            if (XH.flags.applyBigNumberWorkaround) {
                numbro['BigNumber'].clone();
            }

            // Confirm hoist-core version after environment service loaded.
            const hcVersion = XH.getEnv('hoistCoreVersion');
            throwIf(
                !checkMinVersion(hcVersion, MIN_HOIST_CORE_VERSION),
                `This version of Hoist React requires the server to run Hoist Core ≥ v${MIN_HOIST_CORE_VERSION}. Version ${hcVersion} detected.`
            );

            await installServicesAsync([
                AlertBannerService,
                AutoRefreshService,
                ChangelogService,
                ClientHealthService,
                IdleService,
                InspectorService,
                GridAutosizeService,
                GridExportService,
                WebSocketService
            ]);

            // init all models other than Router
            const models = [
                this.appLoadModel,
                this.appStateModel,
                this.pageStateModel,
                this.routerModel,
                this.aboutDialogModel,
                this.changelogDialogModel,
                this.exceptionDialogModel,
                this.feedbackDialogModel,
                this.impersonationBarModel,
                this.optionsDialogModel,
                this.bannerSourceModel,
                this.messageSourceModel,
                this.toastSourceModel,
                this.refreshContextModel,
                this.sizingModeModel,
                this.viewportSizeModel,
                this.themeModel,
                this.userAgentModel
            ];
            models.forEach((m: any) => m.init?.());

            this.bindInitSequenceToAppLoadModel();

            this.setDocTitle();

            // Delay to workaround hot-reload styling issues in dev.
            await wait(XH.isDevelopmentMode ? 300 : 1);

            this.setAppState('INITIALIZING_APP');
            const modelClass: any = this.appSpec.modelClass;
            this.appModel = modelClass.instance = new modelClass();
            await this.appModel.initAsync();
            this.startRouter();
            this.startOptionsDialog();
            this.setAppState('RUNNING');
        } catch (e) {
            this.setAppState('LOAD_FAILED');
            XH.handleException(e, {requireReload: true});
        }
    }

    /**
     * Show the update Banner. Called by EnvironmentService when the server reports that a
     * new (or at least different) version is available and the user should be prompted.
     *
     * @param version - updated version from server.
     * @param build - updated build from server - included for snapshot version prompts.
     */
    showUpdateBanner(version: string, build?: string) {
        // Display build tag for snaps only - not of much interest across actual version updates.
        if (version.includes('SNAPSHOT') && build && build !== 'UNKNOWN') {
            version += ` (b${build})`;
        }

        // Show Banner
        const mobile = XH.isMobileApp,
            message = mobile
                ? 'Update available!'
                : `A new version of ${XH.clientAppName} is available!`,
            buttonText = mobile ? version : `Update to ${version}`;

        XH.showBanner({
            category: 'xhAppUpdate',
            message,
            icon: Icon.rocket({size: 'lg'}),
            intent: 'warning',
            sortOrder: BannerModel.BANNER_SORTS.APP_UPDATE,
            enableClose: false,
            actionButtonProps: {
                icon: Icon.refresh(),
                text: buttonText,
                onClick: () => XH.reloadApp()
            }
        });
    }

    hasAboutDialog() {
        return !isEmpty(this.aboutDialogModel.getItems());
    }

    //----------------------------
    // Implementation
    //-----------------------------
    private setDocTitle() {
        const env = XH.getEnv('appEnvironment'),
            {clientAppName} = this.appSpec;
        document.title = env === 'Production' ? clientAppName : `${clientAppName} (${env})`;
    }

    private startRouter() {
        const routes = this.appModel.getRoutes(),
            defaultRoute = routes.length ? routes[0].name : null;

        this.routerModel.addRoutes(routes);
        this.routerModel.router.setOption('defaultRoute', defaultRoute);
        this.routerModel.router.start();
    }

    private startOptionsDialog() {
        this.optionsDialogModel.setOptions(this.appModel.getAppOptions());
    }

    private setAppState(nextState: AppState) {
        this.appStateModel.setAppState(nextState);
    }

    private bindInitSequenceToAppLoadModel() {
        const terminalStates: AppState[] = ['RUNNING', 'SUSPENDED', 'LOAD_FAILED', 'ACCESS_DENIED'],
            loadingPromise = mobxWhen(() => terminalStates.includes(this.appStateModel.state));
        loadingPromise.linkTo(this.appLoadModel);
    }

    private setViewportContent(content: string) {
        const vp = document.querySelector('meta[name=viewport]');
        vp?.setAttribute('content', content);
    }

    private getViewportContent(): string {
        const vp = document.querySelector('meta[name=viewport]');
        return vp ? vp.getAttribute('content') : '';
    }
}
