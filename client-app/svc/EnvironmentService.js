/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {XH} from 'hoist';
import {Timer} from 'hoist/utils/Timer';
import {SECONDS} from 'hoist/utils/DateTimeUtils';

export class EnvironmentService extends BaseService {

    _data = {};
    
    async initAsync() {
        this._data = await XH.fetchJson({url: 'hoistImpl/environment'});
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

    checkAppVersionAsync = async() => {
        const data = await XH.fetchJson({url: 'hoistImpl/version'}),
            shouldUpdate = data.shouldUpdate,
            appVersion = data.appVersion;

        if (shouldUpdate && appVersion !== this.get('appVersion')) {
            console.log('New App Version Available.');
        }
    }
}
