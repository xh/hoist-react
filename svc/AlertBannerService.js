/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {div, p} from '@xh/hoist/cmp/layout';
import {HoistService, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {compact, isEmpty, map, trim} from 'lodash';

/**
 * Service to display an app-wide alert banner, as configured via the Hoist Admin console.
 *
 * For this service to be active, a client-visible `xhAlertBannerConfig` config must be specified
 * as `{enabled:true, interval: x}`, where `x` sets this service's polling frequency in seconds.
 */
export class AlertBannerService extends HoistService {

    @managed
    timer;

    get interval() {
        const conf = XH.getConf('xhAlertBannerConfig', {});
        return (conf.enabled && conf.interval) ? conf.interval * SECONDS : -1;
    }

    get enabled() {
        return this.interval > 0;
    }

    get lastDismissed() {
        return XH.localStorageService.get('xhAlertBanner.lastDismissed');
    }

    async initAsync() {
        this.timer = Timer.create({
            runFn: () => this.checkForBannerAsync(),
            interval: this.interval
        });
    }

    async checkForBannerAsync() {
        if (!this.enabled) return;

        const category = 'xhAlertBanner',
            results = await XH.jsonBlobService.listAsync({
                type: 'xhAlertBanner',
                includeValue: true
            });

        if (isEmpty(results)) {
            XH.hideBanner(category);
            return;
        }

        const {active, message, intent, iconName, enableClose, updated, expires} = results[0].value,
            {lastDismissed, onClose} = this;

        if (!active || !message || (expires && expires < Date.now())) {
            XH.hideBanner(category);
        } else if (!lastDismissed || lastDismissed < updated) {
            const conf = this.genBannerConfig({message, intent, iconName, enableClose});
            XH.showBanner({...conf, onClose});
        }
    }

    /** Called from admin {@see AlertBannerModel} to support preview. */
    genBannerConfig({message, intent, iconName, enableClose}) {
        const icon = iconName ? Icon.icon({iconName, size: 'lg'}) : null,
            msgLines = compact(map(message.split('\n'), trim)),
            showFullAlert = () => XH.alert({
                title: 'Alert',
                icon,
                message: div(msgLines.map(it => p(it)))
            });

        let actionButtonProps, onClick;
        if (msgLines.length > 1) {
            actionButtonProps = {
                text: XH.isMobileApp ? 'More' : 'Read more...',
                onClick: showFullAlert
            };
        } else if (XH.isMobileApp) {
            onClick = showFullAlert;
        }

        return {
            message: msgLines[0],
            category: 'xhAlertBanner',
            intent,
            icon,
            enableClose,
            actionButtonProps,
            onClick
        };
    }

    onClose = () => {
        XH.localStorageService.set('xhAlertBanner.lastDismissed', Date.now());
    }
}
