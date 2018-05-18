/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from 'hoist/core';
import {SECONDS} from 'hoist/utils/DateTimeUtils';
import {ToastManager} from 'hoist/toast';
import {action, observable, computed} from 'hoist/mobx';
import {min} from 'lodash';
import {Timer} from 'hoist/utils/Timer';

@HoistModel()
export class MonitorResultsModel {
    @observable.ref results = [];
    @observable lastRun = null;
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
            delay: 10 * SECONDS,
            interval: 10 * SECONDS
        });
    }

    async loadAsync() {
        this.loadResults();
    }

    loadResults = async() => {
        if (!this.tabPaneModel.isActive) return;

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
        this.getLastRun();
    }

    async forceRunAllMonitors() {
        return XH
            .fetchJson({url: 'monitorAdmin/forceRunAllMonitors'})
            .then(
                () => ToastManager.show({
                    message: 'Request received. Results will be generated shortly.'
                })
            )
            .catchDefault();
    }

    @action
    getLastRun() {
        const lastRun = min(this.results.
            filter(monitor => monitor.status !== 'UNKNOWN')
            .map(it => it.date));

        this.lastRun = lastRun ? new Date(lastRun) : null;
    }
}