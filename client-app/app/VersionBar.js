/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, environmentService, prefService} from 'hoist';
import {box} from 'hoist/layout';
import './VersionBar.css';

export class VersionBar extends Component {

    render() {
        const env = environmentService.get('appEnvironment'),
            version = environmentService.get('appVersion'),
            isVisible = (env !== 'Production' || prefService.getPref('xhForceEnvironmentFooter')),
            cls = `xh-version-bar xh-version-bar-${env.toLowerCase()}`;

        if (!isVisible) return null;

        return box({
            justifyContent: 'center',
            alignItems: 'center',
            flex: 'none',
            cls,
            item: [XH.appName, env, version].join(' • ')
        });
    }

}
export const versionBar = elemFactory(VersionBar);