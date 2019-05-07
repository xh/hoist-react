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
import {button} from '@xh/hoist/mobile/cmp/button';
import './VersionBar.scss';
import {AppContainerModel} from '@xh/hoist/core/appcontainer/AppContainerModel';

/**
 * @private
 */
@HoistComponent
export class VersionBar extends Component {

    static modelClass = AppContainerModel;

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
                button({
                    icon: Icon.info(),
                    modifier: 'quiet',
                    onClick: this.onInfoClick
                })
            ]
        });
    }

    onInfoClick = () => {
        XH.showAboutDialog();
    }
}
export const versionBar = elemFactory(VersionBar);