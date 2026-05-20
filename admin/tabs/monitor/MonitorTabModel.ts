/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {MonitorResults, MonitorStatus} from '@xh/hoist/admin/tabs/monitor/Types';
import {LoadSpec, managed, persist, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {pluralize} from '@xh/hoist/utils/js';
import {filter, isEqual, minBy, sortBy} from 'lodash';
import {BaseAdminTabModel} from '@xh/hoist/admin/tabs/BaseAdminTabModel';

export class MonitorTabModel extends BaseAdminTabModel {
    override persistWith = {localStorageKey: 'xhAdminClientMonitorState'};

    @observable.ref results: MonitorResults[] = [];
    @observable lastRun: number = null;

    @managed readonly timer: Timer;

    @bindable @persist showInactive = false;
    @bindable showEditorDialog = false;

    @computed
    get passed(): number {
        return filter(this.results, {status: 'OK'}).length;
    }

    @computed
    get warned(): number {
        return filter(this.results, {status: 'WARN'}).length;
    }

    @computed
    get failed(): number {
        return filter(this.results, {status: 'FAIL'}).length;
    }

    @computed
    get inactive(): number {
        return filter(this.results, {status: 'INACTIVE'}).length;
    }

    get countsByStatus() {
        const {passed, warned, failed, inactive} = this;
        return {OK: passed, WARN: warned, FAIL: failed, INACTIVE: inactive};
    }

    get worstStatus(): MonitorStatus {
        if (this.failed) return 'FAIL';
        if (this.warned) return 'WARN';
        if (this.passed) return 'OK';
        return 'INACTIVE';
    }

    constructor() {
        super();
        makeObservable(this);

        this.timer = Timer.create({
            runFn: this.autoRefreshAsync,
            interval: 5 * SECONDS,
            delay: true
        });

        this.addReaction({
            track: () => this.showInactive,
            run: this.refreshAsync
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        if (!this.isVisible) return;

        try {
            const results = await XH.fetchJson({url: 'monitorResultsAdmin/results', loadSpec});
            this.installResults(results);
        } catch (e) {
            this.installResults([]);
            throw e;
        }
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
    private installResults(results: MonitorResults[]) {
        if (!this.showInactive) {
            results = results.filter(it => it.status !== 'INACTIVE');
        }

        const prevCounts = this.countsByStatus;
        this.results = sortBy(results, 'sortOrder');
        this.lastRun = minBy(results, 'dateComputed')?.dateComputed ?? null;

        // Generate toast with rough indication of change.
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
    }
}
