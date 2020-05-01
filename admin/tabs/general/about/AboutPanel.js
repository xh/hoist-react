/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {div, h2, hbox, table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {hoistCmp, XH} from '@xh/hoist/core';
import {fmtDateTime} from '@xh/hoist/format';
import {Icon, xhLogo} from '@xh/hoist/icon';
import React from 'react';
import './AboutPanel.scss';

export const aboutPanel = hoistCmp.factory(
    () => div({
        className: 'xh-admin-about-panel',
        items: [
            h2(Icon.info(), 'About This Application'),
            ...renderTables(),
            renderBlurb()
        ]
    })
);

function renderTables() {
    const svc = XH.environmentService,
        startupTime = svc.get('startupTime'),
        row = (label, data) => {
            return data != null ? tr(th(label), td(data)) : null;
        };

    // Snapshot versions are tagged with a timestamp - show that in local time here
    // to aid in identifying when/if a snapshot has been updated.
    let hrVersion = svc.get('hoistReactVersion');
    if (hrVersion.includes('SNAPSHOT.')) {
        const snapDate = new Date(parseInt(hrVersion.split('SNAPSHOT.')[1]));
        hrVersion += ` (${fmtDateTime(snapDate)})`;
    }

    return [
        table({
            item: tbody(
                row('App Name / Code', `${svc.get('appName')} / ${svc.get('appCode')}`),
                row('Environment', svc.get('appEnvironment')),
                row('Database', svc.get('databaseConnectionString')),
                row('DB User / Create Mode', `${svc.get('databaseUser')} / ${svc.get('databaseCreateMode')}`),
                startupTime ? row('Server Uptime', relativeTimestamp({timestamp: startupTime, options: {pastSuffix: ''}})) : null
            )
        }),
        h2(Icon.books(), 'Application and Library Versions'),
        table({
            item: tbody(
                row('UI Server', `${svc.get('appVersion')} (build ${svc.get('appBuild')})`),
                row('Hoist Core', svc.get('hoistCoreVersion')),
                row('Grails', svc.get('grailsVersion')),
                row('Java', svc.get('javaVersion'))
            )
        }),
        table({
            item: tbody(
                row('JS Client', `${svc.get('clientVersion')} (build ${svc.get('clientBuild')})`),
                row('Hoist React', hrVersion),
                row('React', svc.get('reactVersion')),
                row('ag-Grid', svc.get('agGridVersion')),
                row('Blueprint Core', svc.get('blueprintCoreVersion')),
                row('MobX', svc.get('mobxVersion'))
            )
        })
    ];
}

function renderBlurb() {
    return hbox({
        className: 'xh-admin-about-panel__blurb',
        items: [
            xhLogo(),
            div(
                <p>
                    Built with Hoist: a plugin for rich web-application development provided by
                    <a href="http://xh.io" target="_blank" rel="noopener noreferrer"> Extremely Heavy</a>.
                </p>,
                <p>Please contact <a href="mailto:support@xh.io">support@xh.io</a> with any questions.</p>
            )
        ]
    });
}
