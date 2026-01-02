/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
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
            build = envSvc.get('clientBuild'),
            version = envSvc.get('clientVersion'),
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
                    className: 'xh-version-bar__tabid',
                    title: 'Tab ID',
                    item: XH.tabId
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
                    onClick: () => XH.appContainerModel.openAdmin()
                }),
                // Force GC, available via V8/chromium and "start chrome --js-flags="--expose-gc"
                Icon.memory({
                    omit: !window['gc'],
                    title: 'Force GC',
                    onClick: () => window['gc']()
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
