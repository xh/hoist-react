/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import './VersionBar.scss';

/** @internal */
export const versionBar = hoistCmp.factory({
    displayName: 'VersionBar',
    render() {
        if (!isShowing()) return null;

        const inspectorSvc = XH.inspectorService,
            env = XH.getEnv('appEnvironment'),
            version = XH.getEnv('clientVersion'),
            build = XH.getEnv('clientBuild'),
            isAdminApp = window.location.pathname?.startsWith('/admin/'),
            versionAndBuild =
                !build || build === 'UNKNOWN' ? version : `${version} (build ${build})`;

        return box({
            justifyContent: 'center',
            alignItems: 'center',
            flex: 'none',
            className: `xh-version-bar xh-version-bar--${env.toLowerCase()}`,
            items: [
                [XH.appName, env, versionAndBuild].join(' • '),
                Icon.info({
                    omit: !XH.appContainerModel.hasAboutDialog(),
                    onClick: () => XH.showAboutDialog()
                }),
                Icon.search({
                    omit: !inspectorSvc.enabled,
                    onClick: () => inspectorSvc.toggleActive()
                }),
                Icon.wrench({
                    omit: isAdminApp || !XH.getUser().isHoistAdminReader,
                    onClick: () => window.open('/admin')
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
