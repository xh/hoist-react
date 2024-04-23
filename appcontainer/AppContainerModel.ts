/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
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
import {action, when as mobxWhen} from '@xh/hoist/mobx';
import {never, wait} from '@xh/hoist/promise';
import numbro from 'numbro';
import {createRoot} from 'react-dom/client';
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
    WebSocketService
} from '@xh/hoist/svc';
import {MINUTES} from '@xh/hoist/utils/datetime';
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
     * Main entry point. Initialize and render application code.
     */
    renderApp<T extends HoistAppModel>(appSpec: AppSpec<T>) {
        // Remove the pre-load exception handler installed by preflight.js
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

        // Disable browser context menu on long-press, used to show (app) context menus and as an
        // alternate gesture for tree grid drill-own.
        if (isMobileApp) {
            window.addEventListener('contextmenu', e => e.preventDefault(), {capture: true});
        }

        try {
            await installServicesAsync(FetchService);

            // consult (optional) pre-auth init for app
            const modelClass: any = this.appSpec.modelClass;
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

            let ex = e;
            if (ex.isServerUnavailable) {
                const {baseUrl} = XH,
                    pingURL = baseUrl.startsWith('http')
                        ? `${baseUrl}ping`
                        : `${window.location.origin}${baseUrl}ping`;

                ex = XH.exception({
                    name: 'Unable to Contact UI Server',
                    message:
                        'Client is unable to contact the UI server.  Please check the UI server at the ' +
                        `following location: ${pingURL}`,
                    details: ex
                });
            }

            XH.handleException(ex, {requireReload: true});
        }
    }

    /**
     * Complete initialization. Called after the client has confirmed that the user is generally
     * authenticated and known to the server (regardless of application roles at this point).
     */
    @action
    async completeInitAsync() {
        try {
            // Install identity service and confirm access
            await installServicesAsync(IdentityService);
            if (!this.appStateModel.checkAccess()) {
                this.setAppState('ACCESS_DENIED');
                return;
            }

            // Complete initialization process
            this.setAppState('INITIALIZING');
            await installServicesAsync([ConfigService, LocalStorageService]);
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
    private async getAuthStatusFromServerAsync(): Promise<boolean> {
        return XH.fetchService
            .fetchJson({
                url: 'xh/authStatus',
                timeout: 3 * MINUTES // Accommodate delay for user at a credentials prompt
            })
            .then(r => r.authenticated)
            .catch(e => {
                // 401s normal / expected for non-SSO apps when user not yet logged in.
                if (e.httpStatus === 401) return false;
                // Other exceptions indicate e.g. connectivity issue, server down - raise to user.
                throw e;
            });
    }

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
}
