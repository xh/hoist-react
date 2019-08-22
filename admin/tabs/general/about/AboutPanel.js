/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {XH, hoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {div, h1, h2, table, tbody, tr, th, td} from '@xh/hoist/cmp/layout';
import {fmtDateTime} from '@xh/hoist/format';

import './AboutPanel.scss';

export const AboutPanel = hoistComponent(() => {
    return div({
        className: 'xh-admin-about-panel xh-tiled-bg',
        items: [
            h1(Icon.info(), 'About This Application'),
            ...renderTables(),
            renderBlurb()
        ]
    });
});

function renderTables() {
    const svc = XH.environmentService,
        row = (label, data) => tr(th(label), td(data));

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
                row('App', `${svc.get('appName')} (${svc.get('appCode')})`),
                row('Environment', svc.get('appEnvironment')),
                row('Server', svc.get('appVersion')),
                row('Client', svc.get('clientVersion')),
                row('Build', svc.get('clientBuild')),
                row('Database', svc.get('databaseConnectionString')),
                row('Database User', svc.get('databaseUser')),
                row('DB Create Mode', svc.get('databaseCreateMode'))
            )
        }),
        h2(Icon.books(), 'Framework Versions'),
        table({
            item: tbody(
                <tr><th colSpan={2} style={{textAlign: 'left'}}>Server</th></tr>,
                row('Hoist Core', svc.get('hoistCoreVersion')),
                row('Grails', svc.get('grailsVersion')),
                row('Java', svc.get('javaVersion')),
                <tr><th colSpan={2} style={{textAlign: 'left'}}>Client</th></tr>,
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
    return div({
        className: 'xh-admin-about-panel__blurb',
        items: [
            <p>
                Built with Hoist: a plugin for rich web-application development provided by
                <a href="http://xh.io" target="_blank" rel="noopener noreferrer"> Extremely Heavy Industries</a>.
            </p>,
            <p>Please contact <a href="mailto:support@xh.io">support@xh.io</a> with any questions.</p>
        ]
    });
}
