/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import bpPkg from '@blueprintjs/core/package.json';
import {HoistService, XH} from '@xh/hoist/core';
import {agGridVersion} from '@xh/hoist/kit/ag-grid';
import {observable, action, makeObservable} from '@xh/hoist/mobx';
import hoistPkg from '@xh/hoist/package.json';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES, SECONDS} from '@xh/hoist/utils/datetime';
import {checkMaxVersion, checkMinVersion, deepFreeze} from '@xh/hoist/utils/js';
import {defaults} from 'lodash';
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

    private _data = {};

    override async initAsync() {
        const serverEnv = await XH.fetchJson({url: 'xh/environment'}),
            clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Unknown',
            clientTimeZoneOffset = new Date().getTimezoneOffset() * -1 * MINUTES;

        // Favor client-side data injected via Webpack build or otherwise determined locally,
        // then apply all other env data sourced from the server.
        this._data = defaults(
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
        );

        // This bit is considered transient.  Maintain in 'serverInstance' mutable property only
        delete this._data['instanceName'];

        deepFreeze(this._data);

        this.setServerInfo(serverEnv.instanceName, serverEnv.appVersion, serverEnv.appBuild);

        this.addReaction({
            when: () => XH.appIsRunning,
            run: this.startVersionChecking
        });
    }

    get(key: string): any {
        return this._data[key];
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

    private startVersionChecking() {
        const interval = XH.getConf('xhAppVersionCheck', {})?.interval ?? -1;
        Timer.create({
            runFn: this.checkServerVersionAsync,
            interval: interval * SECONDS
        });
    }

    private checkServerVersionAsync = async () => {
        const data = await XH.fetchJson({url: 'xh/version'}),
            {instanceName, appVersion, appBuild, mode} = data;

        // Compare latest version/build info from server against the same info (also supplied by
        // server) when the app initialized. A change indicates an update to the app and will
        // force the user to refresh or prompt the user to refresh via the banner according to the
        // `mode` set in `xhAppVersionCheck`. Builds are checked here to trigger refresh prompts
        // across SNAPSHOT updates for projects with active dev/QA users.
        if (appVersion !== this.get('appVersion') || appBuild !== this.get('appBuild')) {
            if (mode === 'promptReload') {
                XH.appContainerModel.showUpdateBanner(appVersion, appBuild);
            } else if (mode === 'forceReload') {
                XH.suspendApp({
                    reason: 'APP_UPDATE',
                    message: `A new version of ${XH.clientAppName} is now available (${appVersion}) and requires an immediate update.`
                });
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
    private setServerInfo(serverInstance, serverVersion, serverBuild) {
        this.serverInstance = serverInstance;
        this.serverVersion = serverVersion;
        this.serverBuild = serverBuild;
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
