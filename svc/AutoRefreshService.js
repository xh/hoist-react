/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistService, managed, XH} from '@xh/hoist/core';
import {Timer} from '@xh/hoist/utils/async';
import {olderThan, ONE_SECOND, SECONDS} from '@xh/hoist/utils/datetime';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * Service to triggers an app-wide auto-refresh (if enabled, on a configurable interval) via the
 * application's root RefreshContextModel.
 *
 * For this service to be active, it must be configured/enabled in two ways:
 *
 *  1) A refresh interval for the client app must be specified via the `xhAutoRefreshIntervals` JSON
 *     config. Intervals are specified in seconds and keyed by `clientAppCode` to allow for
 *     different auto-refresh behaviors across different JS apps in the same project.
 *
 *  2) The user's `xhAutoRefreshEnabled` preference must be set to true. This is currently a single
 *     pref. applied to all JS apps in the project. Apps can add an {@see AppOption} to allow users
 *     to customize via the global options dialog, or set a default pref value if per-user
 *     customization is not desirable.
 *
 * @see RefreshContextModel - the underlying mechanism used to implement the refresh.
 */
export class AutoRefreshService extends HoistService {

    @managed
    timer;

    get enabled() {
        return (
            this.interval > 0 &&
            XH.appIsRunning &&
            XH.getPref('xhAutoRefreshEnabled', false)
        );
    }

    get interval() {
        const conf = XH.getConf('xhAutoRefreshIntervals', {});
        return withDefault(conf[XH.clientAppCode], -1);
    }

    async initAsync() {
        this.initTime = Date.now();

        this.timer = Timer.create({
            runFn: () => this.onTimerAsync(),
            interval: ONE_SECOND,
            delay: 5 * SECONDS
        });
    }


    //------------------------
    // Implementation
    //------------------------
    async onTimerAsync() {
        if (!this.enabled) return;

        // Base decision to load on when the context was last loaded -- this avoids extra refreshes if user
        // also refreshing manually.  Note that lastLoadRequested undefined on the context until the first load.
        const ctx = XH.refreshContextModel,
            lastLoaded = withDefault(ctx.lastLoadRequested, this.initTime);

        if (olderThan(lastLoaded, this.interval * SECONDS)) {
            console.debug('Triggering application auto-refresh.');
            await ctx.autoRefreshAsync();
        }
    }

}
