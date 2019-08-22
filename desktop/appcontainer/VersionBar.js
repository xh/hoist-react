/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, hoistComponentFactory} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import './VersionBar.scss';

/** @private */
export const versionBar = hoistComponentFactory(() => {

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
            Icon.info({
                onClick: () => XH.showAboutDialog()
            })
        ]
    });
});


//----------------------
// Implementation
//----------------------
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
