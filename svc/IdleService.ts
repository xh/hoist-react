/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
import {MINUTES, olderThan} from '@xh/hoist/utils/datetime';
import {debounce as lodashDebounce} from 'lodash';

/**
 * Manage the idling/suspension of this application after a certain period of user inactivity
 * to cancel background tasks and prompt the user to reload the page when they wish to resume
 * using the app. This approach is typically employed to reduce potential load on back-end
 * system from unattended clients and/or as a "belt-and-suspenders" defence against memory
 * leaks or other performance issues that can arise with long-running sessions.
 *
 * This service consults the `xhIdleConfig` soft-config and the `xhIdleDetectionDisabled`
 * user preference to determine if and when it should suspend the app.
 */
export class IdleService extends HoistService {
    override xhImpl = true;

    static instance: IdleService;

    constructor() {
        super();

        const debouncedSuspender = lodashDebounce(this.maybeSuspend, 3 * MINUTES);

        this.addReaction({
            when: () => XH.appIsRunning,
            run: () =>
                this.addReaction({
                    track: () => XH.lastActivityMs,
                    run: debouncedSuspender
                })
        });
    }

    private maybeSuspend() {
        const idleConfig = XH.getConf('xhIdleConfig', {}),
            {appTimeouts = {}, timeout} = idleConfig,
            configTimeout = (appTimeouts[XH.clientAppCode] ?? timeout ?? -1) * MINUTES,
            configEnabled = configTimeout > 0,
            userEnabled = !XH.getPref('xhIdleDetectionDisabled');

        if (configEnabled && userEnabled && olderThan(XH.lastActivityMs, configTimeout)) {
            XH.suspendApp({reason: 'IDLE'});
        }
    }
}
