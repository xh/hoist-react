/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, environmentService, prefService} from 'hoist';
import {box} from 'hoist/layout';

export class VersionBar extends Component {

    render() {
        const env = environmentService.get('appEnvironment'),
            version = environmentService.get('appVersion'),
            isVisible = (env !== 'Production' || prefService.getPref('xhForceEnvironmentFooter'));

        if (!isVisible) return null;

        return box({
            justifyContent: 'center',
            alignItems: 'center',
            padding: 2,
            style: {
                fontSize: '0.8em',
                color: 'white',
                backgroundColor: this.getFooterColor(env)
            },
            items: `${XH.appName} | ${env} | ${version}`
        });
    }

    getFooterColor(env) {
        switch (env) {
            case 'Production':  return 'red';
            case 'Staging':     return 'orange';
            case 'Development': return 'green';
            default:            return 'green';
        }
    }
}