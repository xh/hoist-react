/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import './styles.css';


import React, {Component} from 'react';
import {XH, environmentService} from 'hoist';
import {div, h2, table, tbody, tr, th, td} from 'hoist/layout';
import {observer} from 'hoist/mobx';

@observer
export class AboutPanel extends Component {

    render() {
        return div({
            cls: 'xh-admin-about-panel',
            items: [
                h2('About This Application'),
                this.renderTable(),
                this.renderBlurb()
            ]
        });
    }

    renderTable() {
        const svc = environmentService,
            row = (label, data) => tr(th(label), td(data));
        return table(
            tbody(
                row('App Name', XH.appName),
                row('Environment', svc.get('appEnvironment')),
                row('App Version', svc.get('appVersion')),
                row('Hoist Core Version', svc.get('hoistCoreVersion')),
                row('Hoist React Version', svc.get('hoistReactVersion')),
                row('Grails Version', svc.get('grailsVersion')),
                row('Java Version', svc.get('javaVersion'))
            )
        );
    }

    renderBlurb() {
        return (
            div({
                style: {marginTop: '10px'},
                items: div({
                    style: {display: 'table-cell', verticalAlign: 'middle', width: '100%'},
                    items: [
                        <p>
                            This application is built with Hoist a plugin for rich web-application development provided
                            by <a href="http://xh.io" target="_blank" rel="noopener noreferrer"> Extremely Heavy Industries</a>.
                        </p>,
                        <p>Please contact <a href="mailto:support@xh.io">support@xh.io</a> with any questions.</p>
                    ]
                })
            })
        );
    }
}
