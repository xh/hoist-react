/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {hbox} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import './VersionBar.scss';

/**
 * @private
 */
@HoistComponent
export class VersionBar extends Component {

    render() {
        const env = XH.getEnv('appEnvironment'),
            version = XH.getEnv('clientVersion'),
            isVisible = (env !== 'Production' || XH.getUser().isHoistAdmin || XH.getPref('xhForceEnvironmentFooter'));

        if (!isVisible) return null;

        return hbox({
            justifyContent: 'center',
            alignItems: 'center',
            flex: 'none',
            className: `xh-version-bar xh-version-bar-${env.toLowerCase()}`,
            items: [
                [XH.appName, env, version].join(' • '),
                Icon.info({onClick: this.showAbout})
            ]
        });
    }

    showAbout() {
        XH.showAboutDialog();
    }
}
export const versionBar = elemFactory(VersionBar);