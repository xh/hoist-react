/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import './VersionBar.scss';

/**
 * @private
 */
@HoistComponent()
export class VersionBar extends Component {

    render() {
        const env = XH.getEnv('appEnvironment'),
            version = XH.getEnv('clientVersion'),
            isVisible = (env !== 'Production' || XH.getPref('xhForceEnvironmentFooter'));

        if (!isVisible) return null;

        return box({
            justifyContent: 'center',
            alignItems: 'center',
            flex: 'none',
            cls: `xh-version-bar xh-version-bar-${env.toLowerCase()}`,
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