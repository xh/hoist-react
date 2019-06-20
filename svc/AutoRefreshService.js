import {HoistService, managed, XH} from '@xh/hoist/core';
import {Timer} from '@xh/hoist/utils/async';
import {ONE_SECOND, SECONDS} from '@xh/hoist/utils/datetime';
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
@HoistService
export class AutoRefreshService {

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
        return conf[XH.clientAppCode] || -1;
    }

    initAsync() {
        this.initTime = Date.now();

        this.timer = Timer.create({
            runFn: this.refreshIfIntervalExpired,
            interval: ONE_SECOND
        });
    }


    //------------------------
    // Implementation
    //------------------------
    refreshIfIntervalExpired = () => {
        if (!this.enabled) return;

        const {refreshContextModel} = XH,
            // Note lastLoadRequested is undefined until RCM's first loadAsync() call.
            lastLoaded = withDefault(refreshContextModel.lastLoadRequested, this.initTime);

        if ((Date.now() - lastLoaded) > (this.interval * SECONDS)) {
            console.debug('Triggering application auto-refresh.');
            refreshContextModel.autoRefreshAsync();
        }
    }

}