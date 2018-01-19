/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {XH, environmentService} from 'hoist';
import {div, h1} from 'hoist/layout';

import {adminTab} from '../AdminTab';


@adminTab('About')
export class AboutPanel extends Component {

    render() {
        return div({
            cls: 'xh-admin-about-panel',
            items: [
                <h1>About This Application</h1>,
                this.renderTable(),
                this.renderBlurb()
            ]
        });

    }

    renderTable() {
        const svc = environmentService,
            row = (label, data) => <tr><th>{label}</th><td>{data}</td></tr>;
        return (
            <table>
                <tbody>
                    {row('App Name', XH.appName)}
                    {row('Environment', svc.get('appEnvironment'))}
                    {row('App Version', svc.get('appVersion'))}
                    {row('Hoist Core Version', svc.get('hoistCoreVersion'))}
                    {row('Hoist React Version', svc.get('hoistReactVersion'))}
                    {row('Grails Version', svc.get('grailsVersion'))}
                    {row('Java Version', svc.get('javaVersion'))}
                </tbody>
            </table>
        );
    }

    renderBlurb() {
        const blurbStyle = {display: 'table-cell', verticalAlign: 'middle', width: '100%' };

        return (
            <div style={{marginTop: '10px'}}>
                <div style={blurbStyle}>
                    <p>
                        <b>This application is built with Hoist</b>,
                        a plugin for rich web-application development provided by
                        <a href="http://xh.io" target="_blank" rel="noopener noreferrer"> Extremely Heavy Industries</a>.
                    </p>
                    <p>Please contact <a href="mailto:support@xh.io">support@xh.io</a> with any questions.</p>
                </div>
            </div>
        );
    }

    // @adminTab requires this be defined, however we have no use of it here
    loadAsync() {

    }
}
