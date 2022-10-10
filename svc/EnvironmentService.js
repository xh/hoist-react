/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import bpPkg from '@blueprintjs/core/package.json';
import {HoistService, XH} from '@xh/hoist/core';
import {agGridVersion} from '@xh/hoist/kit/ag-grid';
import {observable} from '@xh/hoist/mobx';
import hoistPkg from '@xh/hoist/package.json';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES, SECONDS} from '@xh/hoist/utils/datetime';
import {deepFreeze} from '@xh/hoist/utils/js';
import {defaults} from 'lodash';
import {action, makeObservable} from 'mobx';
import mobxPkg from 'mobx/package.json';
import {version as reactVersion} from 'react';

export class EnvironmentService extends HoistService {

    /**
     * @member {string} - version of this application currently running on the Hoist UI server.
     *  Unlike all other EnvironmentService state, this is refreshed by default on a configured
     *  interval and is observable to allow apps to take actions (e.g. reload immediately) when
     *  they detect an update on the server.
     */
    @observable serverVersion;

    /** @member {string} - build of this application currently running on the Hoist UI server. */
    @observable serverBuild;

    _data = {};

    async initAsync() {
        const serverEnv = await XH.fetchJson({url: 'xh/environment'}),
            clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Unknown',
            clientTimeZoneOffset = (new Date()).getTimezoneOffset() * -1 * MINUTES;

        // Favor client-side data injected via Webpack build or otherwise determined locally,
        // then apply all other env data sourced from the server.
        this._data = defaults({
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
        }, serverEnv);

        deepFreeze(this._data);

        this.setServerVersion(serverEnv.appVersion, serverEnv.appBuild);

        this.addReaction({
            when: () => XH.appIsRunning,
            run: this.startVersionChecking
        });
    }

    get(key) {
        return this._data[key];
    }

    isProduction() {
        return this.get('appEnvironment') === 'Production';
    }

    isTest() {
        return this.get('appEnvironment') === 'Test';
    }

    //------------------------------
    // Implementation
    //------------------------------
    constructor() {
        super();
        makeObservable(this);
    }

    startVersionChecking() {
        Timer.create({
            runFn: this.checkServerVersionAsync,
            interval: 'xhAppVersionCheckSecs',
            intervalUnits: SECONDS
        });
    }

    checkServerVersionAsync = async () => {
        const data = await XH.fetchJson({url: 'xh/version'}),
            {appVersion, appBuild, shouldUpdate} = data;

        // Compare latest version/build info from server against the same info (also supplied by
        // server) when the app initialized. A change indicates an update to the app and will
        // prompt the user to refresh via the Banner, unless suppressed via shouldUpdate flag.
        // Builds are checked here to trigger refresh prompts across SNAPSHOT updates for projects
        // with active dev/QA users.
        if (
            shouldUpdate &&
            (appVersion !== this.get('appVersion') || appBuild !== this.get('appBuild'))
        ) {
            XH.appContainerModel.showUpdateBanner(appVersion, appBuild);
        }

        // Note that the case of version mismatches across the client and server we do *not* show
        // the update bar to the user - that would indicate a deployment issue that a client reload
        // is unlikely to resolve, leaving the user in a frustrating state where they are endlessly
        // prompted to refresh.
        const clientVersion = this.get('clientVersion');
        if (appVersion !== clientVersion) {
            console.warn(`Version mismatch detected between client and server - ${clientVersion} vs ${appVersion}`);
        }

        this.setServerVersion(appVersion, appBuild);
    };

    @action
    setServerVersion(serverVersion, serverBuild) {
        this.serverVersion = serverVersion;
        this.serverBuild = serverBuild;
    }
}
