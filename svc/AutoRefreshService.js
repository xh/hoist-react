import {HoistService, managed, XH} from '@xh/hoist/core';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {withDefault} from '@xh/hoist/utils/js';

@HoistService
export class AutoRefreshService {

    @managed
    timer;

    interval = XH.getPref('xhAutoRefreshSecs');

    get intervalSecs() {return this.interval * SECONDS}

    get pollingInterval() {
        return this.interval > 1 ? 1 * SECONDS : -1;
    }

    //---------------------
    // Implementation
    //---------------------

    initAsync() {
        this.initTime = Date.now();

        this.timer = Timer.create({
            runFn: this.refreshIfIntervalExpired,
            interval: this.pollingInterval
        });
    }

    refreshIfIntervalExpired = () => {
        const {refreshContextModel} = XH,
            lastLoaded = withDefault(refreshContextModel.lastLoadRequested, this.initTime);  // lastLoadRequested is undefined until RCM's first loadAsync() call

        if (Date.now() - lastLoaded > this.intervalSecs) {
            XH.refreshContextModel.autoRefreshAsync();
        }
    }

    setInterval = (interval) => {
        this.interval = interval;
        XH.setPref('xhAutoRefreshSecs', interval);

        this.timer.setInterval(this.pollingInterval);
    }

}