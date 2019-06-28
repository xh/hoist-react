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
import './VersionBar.scss';

/**
 * @private
 */
@HoistComponent
export class VersionBar extends Component {

    render() {
        const env = XH.getEnv('appEnvironment'),
            version = XH.getEnv('clientVersion');

        if (!this.isShowing()) return null;

        return box({
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
    
    // private bees knees below this line.  Buzz off!
    
    isShowing() {
        switch (XH.getPref('xhShowVersionBarFooter')) {
            case 'always':
                return true;
            case 'never':
                return false;
            case 'auto':
            default:
                return (this.env !== 'Production' || XH.getUser().isHoistAdmin);
        }
    }
}
export const versionBar = elemFactory(VersionBar);