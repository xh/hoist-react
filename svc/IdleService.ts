/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {HoistService, XH, managed} from '@xh/hoist/core';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES, olderThan} from '@xh/hoist/utils/datetime';
import {observable, runInAction, makeObservable} from 'mobx';

/**
 * Manage the idling/suspension of this application after a certain period of user inactivity
 * to cancel background tasks and prompt the user to reload the page when they wish to resume
 * using the app. This approach is typically employed to reduce potential load on back-end
 * system from unattended clients and/or as a "belt-and-suspenders" defence against memory
 * leaks or other performance issues that can arise with long-running sessions.
 *
 * This service consults the `xhIdleConfig` soft-config and the `xh.xhIdleDetectionDisabled`
 * user preference to determine if and when it should suspend the app.
 */
export class IdleService extends HoistService {
    override xhImpl = true;

    static instance: IdleService;

    @observable idleFor = 0;

    @managed
    private timer: Timer = null;
    private timeout = null;

    constructor() {
        super();
        makeObservable(this);

        this.addReaction({
            when: () => XH.appIsRunning,
            run: this.startMonitoring
        });
    }

    //------------------------
    // Implementation
    //------------------------
    private startMonitoring() {
        const idleConfig = XH.getConf('xhIdleConfig', {}),
            {appTimeouts = {}, timeout} = idleConfig,
            configTimeout = (appTimeouts[XH.clientAppCode] ?? timeout ?? -1) * MINUTES,
            configEnabled = configTimeout > 0,
            userEnabled = !XH.getPref('xhIdleDetectionDisabled');

        this.createIdleDurationTimer();

        if (configEnabled && userEnabled) {
            this.timeout = configTimeout;
            this.createSuspendTimer();
        }
    }

    private createIdleDurationTimer() {
        this.timer = Timer.create({
            runFn: () => this.updateIdleDuration(),
            interval: 500
        });
    }

    private createSuspendTimer() {
        this.timer = Timer.create({
            runFn: () => this.checkInactivityTimeout(),
            interval: 500
        });
    }

    private checkInactivityTimeout() {
        if (olderThan(XH.lastActivityMs, this.timeout)) {
            XH.suspendApp({reason: 'IDLE'});
        }
    }

    private updateIdleDuration() {
        const mn = Math.round((Date.now() - XH.lastActivityMs) / MINUTES);
        if (this.idleFor === mn) return;

        runInAction(() => (this.idleFor = mn));
    }
}
