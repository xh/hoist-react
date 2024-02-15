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
     * Unlike all other EnvironmentService state, this is refreshed by default on a configured
     * interval and is observable to allow apps to take actions (e.g. reload immediately) when
     * they detect an update on the server.
     */
    @observable
    serverVersion: string;

    /** Build of this application currently running on the Hoist UI server. */
    @observable
    serverBuild: string;

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

        deepFreeze(this._data);

        this.setServerVersion(serverEnv.appVersion, serverEnv.appBuild);

        this.addReaction({
            when: () => XH.appIsRunning,
            run: this.startVersionChecking
        });
    }

    get(key: string): any {
        return this._data[key];
    }

    isProduction(): boolean {
        return this.get('appEnvironment') === 'Production';
    }

    isTest(): boolean {
        return this.get('appEnvironment') === 'Test';
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
        // Todo: `xhAppVersionCheckSecs` checked for backwards compatibility with hoist-core v16.3.0
        // and earlier - remove in future.
        const interval =
            XH.getConf('xhAppVersionCheck', {})?.interval ??
            XH.getConf('xhAppVersionCheckSecs', null);
        Timer.create({
            runFn: this.checkServerVersionAsync,
            interval: interval * SECONDS
        });
    }

    private checkServerVersionAsync = async () => {
        const data = await XH.fetchJson({url: 'xh/version'}),
            {appVersion, appBuild, mode} = data;

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

        this.setServerVersion(appVersion, appBuild);
    };

    @action
    private setServerVersion(serverVersion, serverBuild) {
        this.serverVersion = serverVersion;
        this.serverBuild = serverBuild;
    }
}
