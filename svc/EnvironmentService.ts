/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import bpPkg from '@blueprintjs/core/package.json';
import {HoistService, XH} from '@xh/hoist/core';
import {agGridVersion} from '@xh/hoist/kit/ag-grid';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import hoistPkg from '@xh/hoist/package.json';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES, ONE_SECOND, SECONDS} from '@xh/hoist/utils/datetime';
import {checkMaxVersion, checkMinVersion, deepFreeze} from '@xh/hoist/utils/js';
import {defaults, isNil} from 'lodash';
import mobxPkg from 'mobx/package.json';
import {version as reactVersion} from 'react';

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
    private pollingConfig: PollingConfig;
    private pollingTimer: Timer;

    override async initAsync() {
        const {pollingConfig, instanceName, ...serverEnv} = await XH.fetchJson({
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

        this.pollingConfig = pollingConfig;
        this.setServerInfo(instanceName, serverEnv.appVersion, serverEnv.appBuild);

        this.addReaction({
            when: () => XH.appIsRunning,
            run: this.startPolling
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

    isMinHoistCoreVersion(version: string): boolean {
        return checkMinVersion(this.get('hoistCoreVersion'), version);
    }

    isMaxHoistCoreVersion(version: string): boolean {
        return checkMaxVersion(this.get('hoistCoreVersion'), version);
    }

    //------------------------------
    // Implementation
    //------------------------------
    constructor() {
        super();
        makeObservable(this);
    }

    private startPolling() {
        this.pollingTimer = Timer.create({
            runFn: this.pollServerAsync,
            interval: this.pollingIntervalMs,
            delay: true
        });
    }

    private pollServerAsync = async () => {
        const data = await XH.fetchJson({url: 'xh/environment'}),
            {pollingConfig, instanceName, appVersion, appBuild} = data;

        // Note potential config change to requested polling interval and onVersionChange behavior.
        if (pollingConfig) {
            this.pollingConfig = pollingConfig;
            this.pollingTimer.setInterval(this.pollingIntervalMs);
        }

        // Compare latest version/build info from server against the same info (also supplied by
        // server) when the app initialized. A change indicates an update to the app and will
        // force the user to refresh or prompt the user to refresh via the banner according to the
        // `updateMode` set in `xhAppStatusCheck`. Builds are checked here to trigger refresh
        // prompts across SNAPSHOT updates for projects with active dev/QA users.
        const {onVersionChange} = this.pollingConfig;
        if (appVersion !== this.get('appVersion') || appBuild !== this.get('appBuild')) {
            if (onVersionChange === 'promptReload') {
                XH.appContainerModel.showUpdateBanner(appVersion, appBuild);
            } else if (onVersionChange === 'forceReload') {
                XH.suspendApp({
                    reason: 'APP_UPDATE',
                    message: `A new version of ${XH.clientAppName} is now available (${appVersion}) and requires an immediate update.`
                });
            } else {
                this.logWarn(
                    `New version ${appVersion} reported by server, but xhEnvPollingConfig.onVersionChange is ${onVersionChange} - ignoring.`
                );
            }
        }

        // Note that the case of version mismatches across the client and server we do *not* show
        // the update bar to the user - that would indicate a deployment issue that a client reload
        // is unlikely to resolve, leaving the user in a frustrating state where they are endlessly
        // prompted to refresh.
        const clientVersion = this.get('clientVersion');
        if (appVersion !== clientVersion) {
            this.logWarn(
                `Version mismatch detected between client and server - ${clientVersion} vs ${appVersion}`
            );
        }

        this.setServerInfo(instanceName, appVersion, appBuild);
    };

    @action
    private setServerInfo(serverInstance: string, serverVersion: string, serverBuild: string) {
        this.serverInstance = serverInstance;
        this.serverVersion = serverVersion;
        this.serverBuild = serverBuild;
    }

    private get pollingIntervalMs(): number {
        const {pollingConfig} = this;

        // Fallback in event of unexpected error reading polling instructions.
        if (isNil(pollingConfig?.interval)) return 10 * SECONDS;

        // Disable timer if interval is set to 0 or less.
        if (pollingConfig.interval <= 0) return -1;

        // Throttle polling to once every five seconds, at most.
        return Math.max(pollingConfig.interval * ONE_SECOND, 5 * SECONDS);
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

interface PollingConfig {
    interval: number;
    onVersionChange: 'forceReload' | 'promptReload' | 'silent';
}
