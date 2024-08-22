/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {markdown} from '@xh/hoist/cmp/markdown';
import {BannerSpec, HoistService, Intent, managed, XH} from '@xh/hoist/core';
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
    override xhImpl = true;

    static instance: AlertBannerService;

    @managed
    private timer: Timer;

    get interval(): number {
        const conf = XH.getConf('xhAlertBannerConfig', {});
        return conf.enabled && conf.interval ? conf.interval * SECONDS : -1;
    }

    get enabled(): boolean {
        return this.interval > 0;
    }

    get lastDismissed(): number {
        return XH.localStorageService.get('xhAlertBanner.lastDismissed');
    }

    override async initAsync() {
        this.timer = Timer.create({
            runFn: () => this.checkForBannerAsync(),
            interval: this.interval
        });
    }

    async checkForBannerAsync() {
        if (!this.enabled) return;

        const data: AlertBannerSpec = await XH.fetchJson({url: 'xh/alertBanner'}),
            {active, expires, publishDate, message, intent, iconName, enableClose, limitTo} = data,
            {lastDismissed, onClose} = this;

        if (
            !active ||
            !message ||
            (expires && expires < Date.now()) ||
            (lastDismissed && lastDismissed > publishDate) ||
            isEmpty(limitTo) ||
            !this.isTargetedApp(limitTo) ||
            !this.isTargetedAppVersion(limitTo) ||
            !this.isTargetedRole(limitTo)
        ) {
            XH.hideBanner('xhAlertBanner');
        } else {
            const conf = this.genBannerSpec(message, intent, iconName, enableClose);
            XH.showBanner({...conf, onClose});
        }
    }

    genBannerSpec(
        message: string,
        intent: Intent,
        iconName: string,
        enableClose: boolean
    ): BannerSpec {
        const icon = iconName ? Icon.icon({iconName, size: 'lg'}) : null,
            msgLines = compact(map(message.split('\n'), trim)),
            showFullAlert = () =>
                XH.alert({
                    title: 'Alert',
                    icon,
                    message: markdown({content: message})
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
            sortOrder: BannerModel.BANNER_SORTS.ADMIN_ALERT,
            actionButtonProps,
            onClick
        };
    }

    private onClose = () => {
        XH.localStorageService.set('xhAlertBanner.lastDismissed', Date.now());
    };

    /**
     * Returns `true` if there are no limitations on application or if the
     * current application is included in the defined limits.
     * Returns `false` otherwise.
     */
    private isTargetedApp(limitTo: string[]): boolean {
        return (
            !limitTo.some(entry => entry.includes('app-')) ||
            limitTo.includes(`app-${XH.clientAppCode}`)
        );
    }

    /**
     * Returns `true` if there are no limitations on app version or if the
     * current app version is within the defined limits.
     * Returns `false` otherwise.
     */
    private isTargetedAppVersion(limitTo: string[]): boolean {
        return (
            !limitTo.some(entry => entry.includes('appVer-')) ||
            limitTo.includes(`appVer-${XH.appVersion}`)
        );
    }

    /**
     * Returns `true` if there are no limitations on user role or if the
     * current user has a role specified within the defined limits.
     * Returns `false` otherwise.
     */
    private isTargetedRole(limitTo: string[]): boolean {
        if (!limitTo.some(entry => entry.includes('role-'))) return true;
        for (const entry of limitTo) {
            if (!entry.includes('role-')) continue;
            if (XH.getUser().hasRole(entry.substring(5))) return true;
        }
        return false;
    }
}

/**
 * @internal
 */
export interface AlertBannerSpec {
    active: boolean;
    expires: number;
    publishDate: number;
    message: string;
    intent: Intent;
    iconName: string;
    enableClose: boolean;
    limitTo: string[];
    created: number;
    updated: number;
    updatedBy: string;
}
