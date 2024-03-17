/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
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
 *     pref. applied to all JS apps in the project. Apps can add an {@link AppOption} to allow users
 *     to customize via the global options dialog, or set a default pref value if per-user
 *     customization is not desirable.
 *
 * @see RefreshContextModel - the underlying mechanism used to implement the refresh.
 */
export class AutoRefreshService extends HoistService {
    override xhImpl = true;

    static instance: AutoRefreshService;

    @managed
    private timer: Timer;
    private initTime: number;

    get enabled(): boolean {
        return this.interval > 0 && XH.appIsRunning && XH.getPref('xhAutoRefreshEnabled', false);
    }

    get interval(): number {
        const conf = XH.getConf('xhAutoRefreshIntervals', {});
        return withDefault(conf[XH.clientAppCode], -1);
    }

    override async initAsync() {
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
    private async onTimerAsync() {
        if (!this.enabled || !XH.pageIsVisible) return;

        // Wait interval after lastCompleted -- this prevents extra refreshes if user refreshes
        // manually, or loading slow.  Note auto-loads skipped if any load in progress.
        const ctx = XH.refreshContextModel,
            lastRequested = ctx.lastLoadRequested,
            lastCompleted = ctx.lastLoadCompleted,
            last = lastCompleted ?? this.initTime,
            pendingLoad = lastRequested && lastRequested > lastCompleted;

        if (!pendingLoad && olderThan(last, this.interval * SECONDS)) {
            this.logDebug('Triggering application auto-refresh');
            await ctx.autoRefreshAsync();
        }
    }
}
