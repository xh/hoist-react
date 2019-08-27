/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import './VersionBar.scss';
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';

/**
 * @private
 */
@HoistComponent
export class VersionBar extends Component {

    static modelClass = AppContainerModel;

    render() {
        if (!this.isShowing()) return null;

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
                    onClick: this.onInfoClick
                })
            ]
        });
    }

    onInfoClick = () => {
        XH.showAboutDialog();
    }

    //----------------------
    // Implementation
    //----------------------

    isShowing() {
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

}
export const versionBar = elemFactory(VersionBar);