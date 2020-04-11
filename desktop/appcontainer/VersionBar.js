/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH, hoistCmp} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import './VersionBar.scss';

/** @private */
export const versionBar = hoistCmp.factory({
    displayName: 'VersionBar',
    render() {
        if (!isShowing()) return null;

        const env = XH.getEnv('appEnvironment'),
            version = XH.getEnv('clientVersion'),
            build = XH.getEnv('clientBuild'),
            versionAndBuild = (!build || build == 'UNKNOWN') ? version : `${version} (build ${build})`;

        return box({
            justifyContent: 'center',
            alignItems: 'center',
            flex: 'none',
            className: `xh-version-bar xh-version-bar--${env.toLowerCase()}`,
            items: [
                [XH.appName, env, versionAndBuild].join(' • '),
                Icon.info({
                    onClick: () => XH.showAboutDialog()
                })
            ]
        });
    }
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
