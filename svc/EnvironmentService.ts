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
import {MINUTES, SECONDS} from '@xh/hoist/utils/datetime';
import {checkMaxVersion, checkMinVersion, deepFreeze} from '@xh/hoist/utils/js';
import {defaults, isFinite} from 'lodash';
import mobxPkg from 'mobx/package.json';
import {version as reactVersion} from 'react';

/**
 * Load and report on the client and server environment, including software versions, timezones, and
 * and other technical information.
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
        const {pollConfig, instanceName, ...serverEnv} = await XH.fetchJson({
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

        this.pollConfig = pollConfig;
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
        this.pollTimer = Timer.create({
            runFn: () => this.pollServerAsync(),
            interval: this.pollIntervalMs,
            delay: true
        });
    }

    private async pollServerAsync() {
        let data;
        try {
            data = await XH.fetchJson({url: 'xh/environmentPoll'});
        } catch (e) {
            this.logError('Error polling server environment', e);
            return;
        }

        // Update config/interval, and server info
        const {pollConfig, serverInstance, appVersion, appBuild} = data;
        this.pollConfig = pollConfig;
        this.pollTimer.setInterval(this.pollIntervalMs);
        this.setServerInfo(serverInstance, appVersion, appBuild);

        // Handle version change
        if (appVersion != XH.getEnv('appVersion') || appBuild != XH.getEnv('appBuild')) {
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
