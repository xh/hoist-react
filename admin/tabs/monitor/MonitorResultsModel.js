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
import {action, observable, autorun} from 'hoist/mobx';
import {Timer} from 'hoist/utils/Timer';
import {Icon} from 'hoist/icon';

export class MonitorResultsModel {
    @observable results = [];
    @observable passed = 1;
    @observable lastRun = '1 minute ago';
    timer = null;

    constructor(props) {
        autorun(() => {
            const {isActive} = props.parentModel;
            this.toggleRefreshTimer(isActive);
        });
    }

    async loadAsync() {
        this.loadResults();
    }

    loadResults = async() => {
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

    toggleRefreshTimer() {
        if (!this.timer) {
            this.timer = Timer.create({
                runFn: this.loadResults,
                delay: 15 * SECONDS,
                interval: 15 * SECONDS
            });
        } else {
            this.timer = this.timer.cancel();
        }
    }
}