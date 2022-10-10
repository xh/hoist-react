/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {action, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {isDisplayed} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {min, sortBy} from 'lodash';

export class MonitorResultsModel extends HoistModel {

    @observable.ref results = [];
    @observable lastRun = null;
    @managed timer = null;
    viewRef = createObservableRef();

    @computed
    get passed(): number {
        return this.results.filter(monitor => monitor.status === 'OK').length;
    }

    @computed
    get warned(): number {
        return this.results.filter(monitor => monitor.status === 'WARN').length;
    }

    @computed
    get failed(): number {
        return this.results.filter(monitor => monitor.status === 'FAIL').length;
    }

    @computed
    get inactive(): number {
        return this.results.filter(monitor => monitor.status === 'INACTIVE').length;
    }

    constructor() {
        super();
        makeObservable(this);

        this.timer = Timer.create({
            runFn: () => this.autoRefreshAsync(),
            interval: 5 * SECONDS,
            delay: true
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        if (!isDisplayed(this.viewRef.current)) return;

        return XH
            .fetchJson({url: 'monitorAdmin/results', loadSpec})
            .then(rows => {
                this.completeLoad(rows);
            }).catch(e => {
                this.completeLoad({});
                throw e;
            });
    }


    async forceRunAllMonitorsAsync() {
        try {
            await XH.fetchJson({url: 'monitorAdmin/forceRunAllMonitors'});
            XH.toast('Request received - results will be generated shortly.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    //-------------------
    // Implementation
    //-------------------
    @action
    private completeLoad(vals) {
        this.results = sortBy(Object.values(vals), 'sortOrder');
        this.getLastRun();
    }

    @action
    private getLastRun() {
        const lastRun = min(this.results.
            filter(monitor => monitor.status !== 'UNKNOWN')
            .map(it => it.date));

        this.lastRun = lastRun ? new Date(lastRun) : null;
    }
}
