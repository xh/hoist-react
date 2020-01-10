/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {version as blueprintCoreVersion} from '@blueprintjs/core/package.json';
import {HoistService, XH} from '@xh/hoist/core';
import {version as hoistReactVersion} from '@xh/hoist/package.json';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {deepFreeze} from '@xh/hoist/utils/js';
import {version as agGridVersion} from 'ag-grid-community/package.json';
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

        this.adjustDocTitleForNonProdEnv();

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
    adjustDocTitleForNonProdEnv() {
        const env = this.get('appEnvironment');
        if (env != 'Production') {
            document.title += ` (${env})`;
        }
    }

    startVersionChecking() {
        Timer.create({
            runFn: this.checkAppVersionAsync,
            interval: XH.getConf('xhAppVersionCheckSecs') * SECONDS
        });
    }

    checkAppVersionAsync = async () => {
        const data = await XH.fetchJson({url: 'xh/version'}),
            shouldUpdate = data.shouldUpdate,
            appVersion = data.appVersion;

        if (shouldUpdate && appVersion !== XH.appVersion) {
            XH.appContainerModel.showUpdateBar(data.appVersion);
        }
    }
}
