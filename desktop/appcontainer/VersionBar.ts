/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {box, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import './VersionBar.scss';

/** @internal */
export const versionBar = hoistCmp.factory({
    displayName: 'VersionBar',
    render() {
        if (!isShowing()) return null;

        const inspectorSvc = XH.inspectorService,
            envSvc = XH.environmentService,
            env = envSvc.get('appEnvironment'),
            version = envSvc.get('clientVersion'),
            build = envSvc.get('clientBuild'),
            instance = envSvc.serverInstance,
            isAdminApp = window.location.pathname?.startsWith('/admin/'),
            versionAndBuild =
                !build || build === 'UNKNOWN' ? version : `${version} (build ${build})`;

        return box({
            className: `xh-version-bar xh-version-bar--${env.toLowerCase()}`,
            items: [
                [XH.appName, env, versionAndBuild].join(' • '),
                span({
                    className: 'xh-version-bar__spacer',
                    items: '|'
                }),
                span({
                    className: 'xh-version-bar__instance',
                    title: 'Currently Connected Server Instance',
                    items: [Icon.server(), instance]
                }),
                span({
                    className: 'xh-version-bar__spacer',
                    items: '|'
                }),
                Icon.info({
                    omit: !XH.appContainerModel.hasAboutDialog(),
                    title: 'Show About Dialog',
                    onClick: () => XH.showAboutDialog()
                }),
                Icon.search({
                    omit: !inspectorSvc.enabled,
                    title: 'Toggle Hoist Inspector',
                    onClick: () => inspectorSvc.toggleActive()
                }),
                Icon.wrench({
                    omit: isAdminApp || !XH.getUser().isHoistAdminReader,
                    title: 'Open Admin Console',
                    onClick: () => XH.openWindow('/admin', 'xhAdmin')
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
