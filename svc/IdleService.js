/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistService, AppState} from '@xh/hoist/core';
import {MINUTES} from '@xh/hoist/utils/DateTimeUtils';
import {debounce} from 'lodash';
import {Timer} from '@xh/hoist/utils/Timer';

/**
 * Manage the idling/suspension of this application after a certain period of user
 * inactivity.
 *
 * This service is goverened by the property App.disableIdleDetection, the configuration
 * 'xhIdleTimeoutMins', and the user-specific preference 'xh.disableIdleDetection' respectively.
 * Any of these can be used to disable app suspension.
 */
@HoistService()
export class IdleService {

    ACTIVITY_EVENTS = ['keydown', 'mousemove', 'mousedown', 'scroll'];

    async initAsync() {
        const timeout = XH.getConf('xhIdleTimeoutMins') * MINUTES,
            appDisabled = XH.app.idleDetectionDisabled,
            configDisabled = timeout <= 0,
            userDisabled = XH.getPref('xhIdleDetectionDisabled');

        if (!appDisabled && !configDisabled && !userDisabled) {
            this.startCountdown = debounce(() => this.suspendApp(), timeout, {trailing: true});
            this.startCountdown();
            this.createAppListeners();
        }
    }

    //-------------------------------------
    // Implementation
    //-------------------------------------
    createAppListeners() {
        this.ACTIVITY_EVENTS.forEach(e => addEventListener(e, this.startCountdown, true));
    }

    destroyAppListeners() {
        this.ACTIVITY_EVENTS.forEach(e => removeEventListener(e, this.startCountdown, true));
    }

    suspendApp() {
        if (XH.appState != AppState.SUSPENDED) {
            XH.setAppState(AppState.SUSPENDED);
            this.destroyAppListeners();
            Timer.cancelAll();
        }
    }
}