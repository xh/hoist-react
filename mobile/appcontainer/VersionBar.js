/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, hoistCmp} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import './VersionBar.scss';

/**
 * @private
 */
export const versionBar = hoistCmp.factory({

    render() {
        if (!isShowing()) return null;

        const env = XH.getEnv('appEnvironment'),
            version = XH.getEnv('clientVersion');

        return box({
            justifyContent: 'center',
            alignItems: 'center',
            flex: 'none',
            className: `xh-version-bar xh-version-bar--${env.toLowerCase()}`,
            items: [
                [XH.appName, env, version].join(' • '),
                button({
                    icon: Icon.info(),
                    modifier: 'quiet',
                    onClick: () => XH.showAboutDialog()
                })
            ]
        });
    }
});

function isShowing() {
    const env = XH.getEnv('appEnvironment');

    switch (XH.getPref('xhShowVersionBar', 'auto')) {
        case 'always':
            return true;
        case 'never':
            return false;
        case 'auto':
        default:
            return (env !== 'Production' || XH.getUser().isHoistAdmin);
    }
}