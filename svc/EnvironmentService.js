/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {agGridVersion} from '@xh/hoist/dynamics/agGrid';
import {version as blueprintCoreVersion} from '@blueprintjs/core/package.json';
import {HoistService, XH} from '@xh/hoist/core';
import {version as hoistReactVersion} from '@xh/hoist/package.json';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {deepFreeze} from '@xh/hoist/utils/js';
import {defaults} from 'lodash';
import {version as mobxVersion} from 'mobx/package.json';
import React from 'react';

@HoistService
export class EnvironmentService {

    _data = {};

    async initAsync() {
        const serverEnv = await XH.fetchJson({url: 'xh/environment'});

        // Favor client-side data injected via Webpack build or otherwise determined locally,
        // then apply all other env data sourced from the server.
        this._data = defaults({
            appCode: XH.appCode,
            appName: XH.appName,
            clientVersion: XH.appVersion,
            clientBuild: XH.appBuild,
            reactVersion: React.version,
            hoistReactVersion,
            agGridVersion,
            mobxVersion,
            blueprintCoreVersion
        }, serverEnv);

        deepFreeze(this._data);

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

    //------------------------------
    // Implementation
    //------------------------------
    startVersionChecking() {
        Timer.create({
            runFn: this.checkAppVersionAsync,
            interval: 'xhAppVersionCheckSecs',
            intervalUnits: SECONDS
        });
    }

    checkAppVersionAsync = async () => {
        const data = await XH.fetchJson({url: 'xh/version'}),
            {appVersion, appBuild, shouldUpdate} = data;

        // Compare latest version/build info from server against the same info (also supplied by
        // server) when the app initialized. A change indicates an update to the app and will
        // prompt the user to refresh via the updateBar, unless suppressed via shouldUpdate flag.
        // Builds are checked here to trigger refresh prompts across SNAPSHOT updates for projects
        // with active dev/QA users.
        if (
            shouldUpdate &&
            (appVersion !== this.get('appVersion') || appBuild !== this.get('appBuild'))
        ) {
            XH.appContainerModel.showUpdateBar(appVersion, appBuild);
        }

        // Note that the case of version mismatches across the client and server we do *not* show
        // the update bar to the user - that would indicate a deployment issue that a client reload
        // is unlikely to resolve, leaving the user in a frustrating state where they are endlessly
        // prompted to refresh.
        const clientVersion = this.get('clientVersion');
        if (appVersion !== clientVersion) {
            console.warn(`Version mismatch detected between client and server - ${clientVersion} vs ${appVersion}`);
        }
    }
}
