/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React, {Component} from 'react';
import {XH, hoistComponent} from 'hoist/core';
import {div, h3, table, tbody, tr, th, td} from 'hoist/layout';

import './AboutPanel.scss';

@hoistComponent()
export class AboutPanel extends Component {

    render() {
        return div({
            cls: 'xh-admin-about-panel',
            items: [
                h3('About This Application'),
                ...this.renderTables(),
                this.renderBlurb()
            ]
        });
    }

    renderTables() {
        const svc = XH.environmentService,
            row = (label, data) => tr(th(label), td(data));

        return [
            table({
                cls: 'xh-mtb2x',
                item: tbody(
                    row('App Name', XH.appName),
                    row('Environment', svc.get('appEnvironment')),
                    row('Version', svc.get('appVersion'))
                )
            }),
            div({cls: 'xh-mt', items: <p>Framework Versions</p>}),
            table({
                cls: 'xh-mtb2x',
                item: tbody(
                    row('Hoist Core', svc.get('hoistCoreVersion')),
                    row('Hoist React', svc.get('hoistReactVersion')),
                    row('Grails', svc.get('grailsVersion')),
                    row('React', React.version),
                    row('Java Version', svc.get('javaVersion'))
                )
            })
        ];
    }

    renderBlurb() {
        return div({
            cls: 'xh-mt',
            items: [
                <p>
                    This application is built with Hoist a plugin for rich web-application development provided
                    by <a href="http://xh.io" target="_blank" rel="noopener noreferrer"> Extremely Heavy Industries</a>.
                </p>,
                <p>Please contact <a href="mailto:support@xh.io">support@xh.io</a> with any questions.</p>
            ]
        });
    }
}
