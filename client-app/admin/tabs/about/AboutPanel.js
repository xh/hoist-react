/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {XH, environmentService} from 'hoist';
import {div} from 'hoist/layout';

import {adminTab} from '../AdminTab';


@adminTab('About')
export class AboutPanel extends Component {

    render() {
        return div({
            cls: 'xh-admin-about-panel',
            items: [
                <h1>About This Application</h1>,
                this.buildTable(),
                this.buildAboutBlurb()
            ]
        });

    }

    buildTable() {
        const svc = environmentService,
            row = (label, data) => <tr><th>{label}</th><td>{data}</td></tr>;
        return (
            <table>
                <tbody>
                    {row('App Name', XH.appName)}
                    {row('Environment', svc.get('appEnvironment'))}
                    {row('App Version', svc.get('appVersion'))}
                    {row('Hoist Version', svc.get('hoistCoreVersion'))}
                    {row('Grails Version', svc.get('grailsVersion'))}
                    {row('Java Version', svc.get('javaVersion'))}
                </tbody>
            </table>
        );
    }

    buildAboutBlurb() {
        const imgStyle = { display: 'table-cell', verticalAlign: 'middle' },
            blurbStyle = { display: 'table-cell', verticalAlign: 'middle', width: '100%' };

        // image no good at the moment
        return (
            <div style={{marginTop: '10px'}}>
                <div style={imgStyle}>
                    <img src={'/assets/xh/xh.io-120px.png'} className='xh-admin-xhio-logo' alt='Extremely Heavy Industries' />
                </div>
                <div style={blurbStyle}>
                    <p>
                        <b>This application is built with Hoist</b>,
                        a plugin for rich web-application development provided by
                        <a href="http://xh.io" target="_blank"> Extremely Heavy Industries</a>.
                    </p>
                    <p>Please contact <a href="mailto:support@xh.io">support@xh.io</a> with any questions.</p>
                </div>
            </div>
        );
    }

    // @adminTab required this be defined, however we have no use of it here
    loadAsync() {

    }
}
