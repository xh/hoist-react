/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {div, h2, hbox, span, table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {hoistCmp, XH} from '@xh/hoist/core';
import {fmtDateTime} from '@xh/hoist/format';
import {Icon, xhLogo} from '@xh/hoist/icon';
import {MINUTES} from '@xh/hoist/utils/datetime';
import {fmtTimeZone} from '@xh/hoist/utils/impl';
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
    const get = (str) => XH.environmentService.get(str),
        startupTime = get('startupTime'),
        row = (label, data) => {
            data = data || span({item: 'Not available', className: 'xh-text-color-muted'});
            return tr(th(label), td(data));
        };

    // Snapshot versions are tagged with a timestamp - show that in local time here
    // to aid in identifying when/if a snapshot has been updated.
    let hrVersion = get('hoistReactVersion');
    if (hrVersion.includes('SNAPSHOT.')) {
        const snapDate = new Date(parseInt(hrVersion.split('SNAPSHOT.')[1]));
        hrVersion += ` (${fmtDateTime(snapDate)})`;
    }

    // Pending bringing in moment timezone, use these limited apis
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Unknown',
        localTimeZoneOffset = (new Date()).getTimezoneOffset() * -1 * MINUTES;
    return [
        table({
            item: tbody(
                row('App Name / Code', `${get('appName')} / ${get('appCode')}`),
                row('Environment', get('appEnvironment')),
                row('Database', get('databaseConnectionString')),
                row('DB User / Create Mode', `${get('databaseUser')} / ${get('databaseCreateMode')}`),
                row('App Time Zone', fmtTimeZone(get('appTimeZone'), get('appTimeZoneOffset'))),
                row('Server Time Zone', fmtTimeZone(get('serverTimeZone'), get('serverTimeZoneOffset'))),
                row('Client Time Zone',  fmtTimeZone(localTimeZone, localTimeZoneOffset)),
                startupTime ? row('Server Uptime', relativeTimestamp({timestamp: startupTime, options: {pastSuffix: ''}})) : null
            )
        }),
        h2(Icon.books(), 'Application and Library Versions'),
        table({
            item: tbody(
                row('UI Server', `${get('appVersion')} (build ${get('appBuild')})`),
                row('Hoist Core', get('hoistCoreVersion')),
                row('Grails', get('grailsVersion')),
                row('Java', get('javaVersion'))
            )
        }),
        table({
            item: tbody(
                row('JS Client', `${get('clientVersion')} (build ${get('clientBuild')})`),
                row('Hoist React', hrVersion),
                row('React', get('reactVersion')),
                row('ag-Grid', get('agGridVersion')),
                row('Blueprint Core', get('blueprintCoreVersion')),
                row('MobX', get('mobxVersion'))
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


