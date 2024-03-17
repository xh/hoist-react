/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {pluralize} from '@xh/hoist/utils/js';
import {isEqual, min, sortBy} from 'lodash';

export class MonitorResultsModel extends HoistModel {
    @observable.ref results = [];
    @observable lastRun = null;
    @managed timer = null;

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

    get countsByStatus() {
        const {passed, warned, failed, inactive} = this;
        return {OK: passed, WARN: warned, FAIL: failed, INACTIVE: inactive};
    }

    get worstStatus() {
        if (this.failed) return 'FAIL';
        if (this.warned) return 'WARN';
        if (this.passed) return 'OK';
        return 'INACTIVE';
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
        if (!XH.pageIsVisible) return;

        return XH.fetchJson({url: 'monitorResultsAdmin/results', loadSpec})
            .then(rows => {
                this.completeLoad(rows);
            })
            .catch(e => {
                this.completeLoad({});
                throw e;
            });
    }

    async forceRunAllMonitorsAsync() {
        try {
            await XH.fetchJson({url: 'monitorResultsAdmin/forceRunAllMonitors'});
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
        const prevCounts = this.countsByStatus;
        this.results = sortBy(Object.values(vals), 'sortOrder');

        const counts = this.countsByStatus,
            worst = this.worstStatus;

        let intent = null,
            icon = null;
        switch (worst) {
            case 'FAIL':
                intent = 'danger';
                icon = Icon.error();
                break;
            case 'WARN':
                intent = 'warning';
                icon = Icon.warning();
                break;
            case 'OK':
                intent = 'success';
                icon = Icon.checkCircle();
        }

        // This is imperfect, in that e.g. two monitors could swap their status and we would not
        // alert, but this approach is easy and seemed reasonable enough for this low-stakes toast.
        if (!isEqual(prevCounts, counts) && worst !== 'INACTIVE') {
            XH.toast({
                message: `Status update: ${pluralize('monitor', counts[worst], true)} @ ${worst}`,
                timeout: 6000,
                icon,
                intent
            });
        }

        const lastRun = min(
            this.results.filter(monitor => monitor.status !== 'UNKNOWN').map(it => it.date)
        );
        this.lastRun = lastRun ? new Date(lastRun) : null;
    }
}
