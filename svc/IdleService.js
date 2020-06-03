/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {AppState, HoistService, XH, managed} from '@xh/hoist/core';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES} from '@xh/hoist/utils/datetime';
import {isNil} from 'lodash';

/**
 * Manage the idling/suspension of this application after a certain period of user inactivity
 * to cancel background tasks and prompt the user to reload the page when they wish to resume
 * using the app. This approach is typically employed to reduce potential load on back-end
 * system from unattended clients and/or as a "belt-and-suspenders" defence against memory
 * leaks or other performance issues that can arise with long-running sessions.
 *
 * This service consults the `xhIdleTimeouts` soft-config and the `xh.disableIdleDetection`
 * user preference to determine if and when it should suspend the app.
 */
@HoistService
export class IdleService {

    @managed timer = null;
    timeout = null;

    constructor() {
        this.addReaction({
            when: () => XH.appIsRunning,
            run: this.startMonitoring
        });
    }

    //------------------------
    // Implementation
    //------------------------
    startMonitoring() {
        const timeoutConfigs = XH.getConf('xhIdleTimeouts', {}),
            timeout = !isNil(timeoutConfigs[XH.clientAppCode]) ? timeoutConfigs[XH.clientAppCode] * MINUTES : -1,
            configEnabled = timeout > 0,
            userEnabled = !XH.getPref('xhIdleDetectionDisabled');

        if (configEnabled && userEnabled) {
            this.timeout = timeout;
            this.createTimer();
        }
    }

    createTimer() {
        this.timer = Timer.create({
            runFn: () => this.checkInactivityTimeout(),
            interval: 500
        });
    }

    checkInactivityTimeout() {
        if (XH.appState === AppState.SUSPENDED) return;
        const inactiveTime = Date.now() - XH.lastActivityMs;
        if (inactiveTime > this.timeout) this.suspendApp();
    }

    suspendApp() {
        if (XH.appState === AppState.SUSPENDED) return;
        XH.setAppState(AppState.SUSPENDED);
        XH.webSocketService.shutdown();
        Timer.cancelAll();
    }
}