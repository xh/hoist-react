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
 *
 * This service also exposes the observable property `idleFor` which holds the number of minutes
 * that the app has been idle.  Apps that do not want to use Hoist's app suspension (maybe because
 * it will cause users to lose unsaved state) can set up their own "lighter touch" shutdown of resource
 * intensive recurring data calls at whatever threshold of `idleFor` needed.  Apps can resume those
 * calls when the `idleFor` value becomes 0 as activity is detected.
 */
export class IdleService extends HoistService {
    override xhImpl = true;

    static instance: IdleService;

    @observable idleFor: number = 0;

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
        runInAction(() => (this.idleFor = mn));
    }
}
