/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {box, hspacer, span} from '@xh/hoist/cmp/layout';
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
            instance = envSvc.serverInstance,
            isAdminApp = window.location.pathname?.startsWith('/admin/');

        return box({
            className: `xh-version-bar xh-version-bar--${env.toLowerCase()}`,
            items: [
                [XH.appName, env, version].join(' • '),
                divider(),
                span({
                    className: 'xh-version-bar__uuid',
                    title: 'Tab ID',
                    items: [Icon.desktop(), ' ', XH.tabId]
                }),
                hspacer(5),
                span({
                    className: 'xh-version-bar__uuid',
                    title: 'Load ID',
                    item:  XH.loadId
                }),
                divider(),
                span({
                    className: 'xh-version-bar__uuid',
                    title: 'Server',
                    items: [Icon.server(), ' ', instance]
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
                    onClick: () => XH.appContainerModel.openAdmin()
                })
            ]
        });
    }
});

export const divider = hoistCmp.factory(() =>
    span({
        className: 'xh-version-bar__spacer',
        items: '|'
    })
);

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
