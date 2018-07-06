/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistService} from '@xh/hoist/core';
import {SECONDS, MINUTES} from '@xh/hoist/utils/DateTimeUtils';
import {debounce, throttle} from 'lodash';
import {action} from '@xh/hoist/mobx';

@HoistService()
export class IdleService {

    async initAsync() {
        const delay = this.getTimeDelay();

        if (delay > 0) {
            this.resetTimer = throttle(this.resetTimer, 30 * SECONDS);
            this.task = debounce(() => this.timeout(), delay, {trailing: true});

            this.resetTimer();
            this.createAppListener();
        }
    }

    getTimeDelay() {
        return XH.getConf('xhIdleTimeoutMins', 0) * MINUTES;
    }

    //-------------------------------------
    // Implementation
    //-------------------------------------
    createAppListener() {
        window.addEventListener('keydown', this.resetTimer, true);
        window.addEventListener('mousemove', this.resetTimer, true);
        window.addEventListener('mousedown', this.resetTimer, true);
        window.addEventListener('scroll', this.resetTimer, true);
    }

    destroyAppListener() {
        window.removeEventListener('keydown', this.resetTimer, true);
        window.removeEventListener('mousemove', this.resetTimer, true);
        window.removeEventListener('mousedown', this.resetTimer, true);
        window.removeEventListener('scroll', this.resetTimer, true);
    }

    @action
    timeout() {
        this.task.cancel();
        this.destroyAppListener();

        window.dispatchEvent(new CustomEvent('appSuspended'));

        XH.idleComponent = XH.app.showIdleDialog(() => {
            window.location.reload();
        });
    }

    resetTimer = () => {
        this.task();
    }
}