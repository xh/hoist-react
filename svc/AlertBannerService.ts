/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {IconName} from '@fortawesome/fontawesome-svg-core';
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {markdown} from '@xh/hoist/cmp/markdown';
import {BannerSpec, HoistService, Intent, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {compact, isEmpty, map, trim} from 'lodash';

/**
 * Service to display an app-wide alert banner, as configured via the Hoist Admin console.
 *
 * Note that the client is provided with updated banner data from the server via
 * EnvironmentService, and its regular polling.  See 'xhEnvPollConfig' for more information.
 */
export class AlertBannerService extends HoistService {
    override xhImpl = true;

    static instance: AlertBannerService;

    get lastDismissed(): number {
        return XH.localStorageService.get('xhAlertBanner.lastDismissed');
    }

    async updateBanner(spec: AlertBannerSpec) {
        const {active, expires, publishDate, message, intent, iconName, enableClose, clientApps} =
                spec,
            {lastDismissed, onClose} = this;

        if (
            !active ||
            !message ||
            (expires && expires < Date.now()) ||
            (lastDismissed && lastDismissed > publishDate) ||
            !this.isTargetedApp(clientApps)
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
        iconName: IconName,
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

    private isTargetedApp(clientApps: string[]): boolean {
        return isEmpty(clientApps) || clientApps.includes(XH.clientAppCode);
    }
}

/** @internal */
export interface AlertBannerSpec {
    active: boolean;
    expires: number;
    publishDate: number;
    message: string;
    intent: Intent;
    iconName: AlertBannerIconName;
    enableClose: boolean;
    clientApps: string[];
    created: number;
    updated: number;
    updatedBy: string;
}

/** @internal */
export type AlertBannerIconName =
    | 'bullhorn'
    | 'check-circle'
    | 'exclamation-triangle'
    | 'times-circle'
    | 'info-circle'
    | 'question-circle';
