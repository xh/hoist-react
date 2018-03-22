/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist/core';
import {Intent} from 'hoist/kit/blueprint';
import {SECONDS} from 'hoist/utils/DateTimeUtils';
import {ToastManager} from 'hoist/cmp';
import {action, observable, computed} from 'hoist/mobx';
import {Timer} from 'hoist/utils/Timer';
import {Icon} from 'hoist/icon';

export class MonitorResultsModel {
    @observable.ref results = [];
    tabPaneModel = null;
    timer = null;

    @computed
    get passed() {
        return this.results.filter(monitor => monitor.status === 'OK').length;
    }

    @computed
    get warned() {
        return this.results.filter(monitor => monitor.status === 'WARN').length;
    }

    @computed
    get failed() {
        return this.results.filter(monitor => monitor.status === 'FAIL').length;
    }

    constructor(tabPaneModel) {
        this.tabPaneModel = tabPaneModel;
        this.timer = Timer.create({
            runFn: this.loadResults,
            delay: 15 * SECONDS,
            interval: 15 * SECONDS
        });
    }

    async loadAsync() {
        this.loadResults();
    }

    loadResults = async() => {
        if (!this.tabPaneModel.isActive) return;

        console.log('Fetching Results...');
        return XH
            .fetchJson({url: 'monitorAdmin/results'})
            .then(rows => {
                this.completeLoad(true, rows);
            }).catch(e => {
                this.completeLoad(false, e);
                XH.handleException(e);
            });
    }

    @action
    completeLoad(success, vals) {
        this.results = success ? Object.values(vals) : [];
    }

    async forceRunAllMonitors() {
        return XH
            .fetchJson({url: 'monitorAdmin/forceRunAllMonitors'})
            .then(
                ToastManager.getToaster().show({
                    intent: Intent.SUCCESS,
                    message: 'Request received. Results will be generated shortly.',
                    icon: Icon.check({style: {alignSelf: 'center', marginLeft: '5px'}}),
                    timeout: 3 * SECONDS
                })
            )
            .catchDefault();
    }
}