/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import './VersionBar.scss';

/**
 * @internal
 */
export const versionBar = hoistCmp.factory({
    render() {
        if (!isShowing()) return null;

        const svc = XH.environmentService,
            env = svc.get('appEnvironment'),
            version = svc.get('clientVersion'),
            tabId = XH.tabId

        return box({
            justifyContent: 'center',
            alignItems: 'center',
            flex: 'none',
            className: `xh-version-bar xh-version-bar--${env.toLowerCase()}`,
            items: [
                [env, version, tabId].join(' • '),
                button({
                    icon: Icon.info(),
                    minimal: true,
                    omit: !XH.appContainerModel.hasAboutDialog(),
                    onClick: () => XH.showAboutDialog()
                })
            ]
        });
    }
});

function isShowing() {
    const env = XH.getEnv('appEnvironment');

    if (!XH.appModel.supportsVersionBar) return false;

    switch (XH.getPref('xhShowVersionBar', 'auto')) {
        case 'always':
            return true;
        case 'never':
            return false;
        case 'auto':
        default:
            return env !== 'Production' || XH.getUser().isHoistAdminReader;
    }
}
