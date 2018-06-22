/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React from 'react';
import {XH, HoistService} from '@xh/hoist/core';
import {Timer} from '@xh/hoist/utils/Timer';
import {SECONDS} from '@xh/hoist/utils/DateTimeUtils';
import {version as hoistReactVersion} from '@xh/hoist/package.json';
import {defaults} from 'lodash';

@HoistService()
export class EnvironmentService {

    _data = {};
    
    async initAsync() {
        const serverEnv = await XH.fetchJson({url: 'hoistImpl/environment'});

        // Favor client-side data injected via Webpack build or otherwise determined locally,
        // then apply all other env data sourced from the server.
        this._data = defaults({
            appCode: XH.appCode,
            appName: XH.appName,
            clientVersion: XH.appVersion,
            clientBuild: XH.appBuild,
            hoistReactVersion: hoistReactVersion,
            reactVersion: React.version
        }, serverEnv);

        this.startVersionChecking();
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
        const interval = XH.getConf('xhAppVersionCheckSecs');
        Timer.create({
            runFn: this.checkAppVersionAsync,
            delay: 15 * SECONDS,
            interval: interval * SECONDS
        });
    }

    checkAppVersionAsync = async () => {
        const data = await XH.fetchJson({url: 'hoistImpl/version'}),
            shouldUpdate = data.shouldUpdate,
            appVersion = data.appVersion;

        if (shouldUpdate && appVersion !== XH.appVersion) {
            XH.showUpdateBar(data.appVersion);
        }
    }
}
