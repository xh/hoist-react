/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistService, managed, XH} from '@xh/hoist/core';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';

/**
 * Service to display an app-wide alert banner that can be configured through the admin
 *
 * For this service to be active, a refresh interval for the client app must be specified via
 * the `xhAlertBannerRefreshIntervals` config.
 */
export class AlertBannerService extends HoistService {

    @managed
    timer;

    get interval() {
        return XH.getConf('xhAlertBannerRefreshInterval', -1);
    }

    async initAsync() {
        if (this.interval <= 0) return;
        this.timer = Timer.create({
            runFn: () => this.checkForBannerAsync(),
            interval: this.interval * SECONDS
        });
    }

    //------------------------
    // Implementation
    //------------------------
    async checkForBannerAsync() {
        if (this.interval <= 0) return;

        const results = await XH.jsonBlobService.listAsync({
            type: 'xhAlertBanner',
            includeValue: true
        });

        if (isEmpty(results)) return;

        const {active, message, intent, iconName, updated, expires} = results[0].value,
            category = 'xhAlertBanner',
            icon = iconName ? Icon.icon({iconName, size: 'lg'}) : null;

        if (!active || !message || (expires && expires < Date.now())) {
            XH.hideBanner(category);
        } else if (!this._lastShown || this._lastShown < updated) {
            XH.showBanner({category, message, intent, icon});
            this._lastShown = Date.now();
        }
    }
}
