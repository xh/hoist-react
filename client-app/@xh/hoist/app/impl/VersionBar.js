/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, hoistComponent} from 'hoist/core';
import {box} from 'hoist/layout';
import {icon} from 'hoist/kit/blueprint';
import {hoistAppModel} from './HoistAppModel';
import './VersionBar.css';

@hoistComponent()
export class VersionBar extends Component {

    render() {
        const env = environmentService.get('appEnvironment'),
            version = environmentService.get('appVersion'),
            isVisible = (env !== 'Production' || prefService.getPref('xhForceEnvironmentFooter')),
            cls = `xh-version-bar xh-version-bar-${env.toLowerCase()}`,
            info = icon({icon: 'info-sign', iconSize: 16, onClick: this.showAbout});

        if (!isVisible) return null;

        return box({
            justifyContent: 'center',
            alignItems: 'center',
            flex: 'none',
            cls,
            items: [[XH.appName, env, version].join(' • '), info]
        });
    }

    showAbout() {
        hoistAppModel.setShowAbout(true);
    }
}
export const versionBar = elemFactory(VersionBar);