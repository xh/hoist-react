/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import bpPkg from '@blueprintjs/core/package.json';
import {HoistService, XH} from '@xh/hoist/core';
import {agGridVersion} from '@xh/hoist/kit/ag-grid';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import hoistPkg from '@xh/hoist/package.json';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES, SECONDS} from '@xh/hoist/utils/datetime';
import {checkMinVersion, deepFreeze, throwIf} from '@xh/hoist/utils/js';
import {defaults, isFinite} from 'lodash';
import mobxPkg from 'mobx/package.json';
import {version as reactVersion} from 'react';
import {MIN_HOIST_CORE_VERSION} from '../core/XH';

/**
 * Load and report on the client and server environment, including software versions, timezones, and
 * other technical information.
 */
export class EnvironmentService extends HoistService {
    static instance: EnvironmentService;

    /**
     * Version of this application currently running on the Hoist UI server.
     * Unlike most other EnvironmentService state, this is refreshed on a timer and observable.
     */
    @observable
    serverVersion: string;

    /**
     * Build of this application currently running on the Hoist UI server.
     * Unlike most other EnvironmentService state, this is refreshed on a timer and observable.
     */
    @observable
    serverBuild: string;

    /**
     * Instance of Hoist UI server currently delivering content to this client.
     * Unlike most other EnvironmentService state, this is refreshed on a timer and observable.
     */
    @observable
    serverInstance: string;

    private data = {};
    private pollConfig: PollConfig;
    private pollTimer: Timer;

    override async initAsync() {
        const {pollConfig, instanceName, alertBanner, ...serverEnv} = await XH.fetchJson({
                url: 'xh/environment'
            }),
            clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Unknown',
            clientTimeZoneOffset = new Date().getTimezoneOffset() * -1 * MINUTES;

        // Favor client-side data injected via Webpack build or otherwise determined locally,
        // then apply all other env data sourced from the server.
        this.data = deepFreeze(
            defaults(
                {
                    appCode: XH.appCode,
                    appName: XH.appName,
                    clientVersion: XH.appVersion,
                    clientBuild: XH.appBuild,
                    reactVersion,
                    hoistReactVersion: hoistPkg.version,
                    agGridVersion,
                    mobxVersion: mobxPkg.version,
                    blueprintCoreVersion: bpPkg.version,
                    clientTimeZone,
                    clientTimeZoneOffset
                },
                serverEnv
            )
        );

        this.setServerInfo(instanceName, serverEnv.appVersion, serverEnv.appBuild);

        this.ensureVersionRunnable();

        this.pollConfig = pollConfig;
        this.addReaction({
            when: () => XH.appIsRunning,
            run: () => {
                XH.alertBannerService.updateBanner(alertBanner);
                this.startPolling();
            }
        });
    }

    get(key: string): any {
        return this.data[key];
    }

    get appEnvironment(): AppEnvironment {
        return this.get('appEnvironment');
    }

    isProduction(): boolean {
        return this.appEnvironment === 'Production';
    }

    isTest(): boolean {
        return this.appEnvironment === 'Test';
    }

    /**
     * Update critical environment information from server, including current app version + build,
     * upgrade prompt mode, and alert banner.
     *
     * @internal - not for app use. Called by `pollTimer` and as needed by Hoist code.
     */
    async pollServerAsync() {
        let data;
        try {
            data = await XH.fetchJson({url: 'xh/environmentPoll'});
        } catch (e) {
            this.logError('Error polling server environment', e);
            return;
        }

        // Update config/interval, server info, and alert banner.
        const {pollConfig, instanceName, alertBanner, appVersion, appBuild} = data;
        this.pollConfig = pollConfig;
        this.pollTimer.setInterval(this.pollIntervalMs);
        this.setServerInfo(instanceName, appVersion, appBuild);
        XH.alertBannerService.updateBanner(alertBanner);

        // Handle version change - compare to constants baked into client build.
        if (appVersion != XH.appVersion || appBuild != XH.appBuild) {
            // force the user to refresh or prompt the user to refresh via the banner according to config
            // build checked to trigger refresh across SNAPSHOT updates in lower environments
            const {onVersionChange} = pollConfig;
            switch (onVersionChange) {
                case 'promptReload':
                    XH.appContainerModel.showUpdateBanner(appVersion, appBuild);
                    return;
                case 'forceReload':
                    XH.suspendApp({
                        reason: 'APP_UPDATE',
                        message: `A new version of ${XH.clientAppName} is now available (${appVersion}) and requires an immediate update.`
                    });
                    return;
                default:
                    this.logWarn(
                        `New version ${appVersion} reported by server, onVersionChange is ${onVersionChange} - ignoring.`
                    );
            }
        }
    }

    //------------------------------
    // Implementation
    //------------------------------
    constructor() {
        super();
        makeObservable(this);
    }

    private ensureVersionRunnable() {
        const hcVersion = this.get('hoistCoreVersion'),
            clientVersion = this.get('appVersion'),
            serverVersion = this.serverVersion;

        // Check for client/server mismatch version.  It's an ok transitory state *during* the
        // client app lifetime, but app should *never* start this way, would indicate caching issue.
        throwIf(
            clientVersion != serverVersion,
            XH.exception(
                `The version of this client (${clientVersion}) is out of sync with the
                available server (${serverVersion}). Please reload to continue.`
            )
        );

        // Confirm hoist-core/react version mismatch (developer issue)
        throwIf(
            !checkMinVersion(hcVersion, MIN_HOIST_CORE_VERSION),
            XH.exception(
                `This version of Hoist React requires the server to run
                Hoist Core ≥ v${MIN_HOIST_CORE_VERSION}. Version ${hcVersion} detected.`
            )
        );
    }

    private startPolling() {
        this.pollTimer = Timer.create({
            runFn: () => this.pollServerAsync(),
            interval: this.pollIntervalMs,
            delay: true
        });
    }

    @action
    private setServerInfo(serverInstance: string, serverVersion: string, serverBuild: string) {
        this.serverInstance = serverInstance;
        this.serverVersion = serverVersion;
        this.serverBuild = serverBuild;
    }

    private get pollIntervalMs(): number {
        // Throttle to 5secs, disable if set to 0 or less.
        const {interval} = this.pollConfig;
        return isFinite(interval) && interval > 0 ? Math.max(interval, 5) * SECONDS : -1;
    }
}

/**
 * Available application deployment environments, as defined by Hoist Core `AppEnvironment.groovy`.
 *
 * Note that this is distinct from node's `process.env.NODE_ENV`, which will be "production" at
 * runtime on any built/deployed instances of the app, including on Dev/UAT servers.
 */
export type AppEnvironment =
    | 'Production'
    | 'Beta'
    | 'Staging'
    | 'Development'
    | 'Test'
    | 'UAT'
    | 'BCP';

interface PollConfig {
    interval: number;
    onVersionChange: 'forceReload' | 'promptReload' | 'silent';
}
