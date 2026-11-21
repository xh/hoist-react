/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, h2, hbox, span, table, tbody, td, th, tr, a, p} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {fmtDateTime} from '@xh/hoist/format';
import {Icon, xhLogo} from '@xh/hoist/icon';
import {fmtTimeZone} from '@xh/hoist/utils/impl';
import './AboutPanel.scss';

export const aboutPanel = hoistCmp.factory(() =>
    div({
        className: 'xh-admin-about-panel',
        children: [h2(Icon.info(), 'About this Application'), ...renderTables(), renderBlurb()]
    })
);

function renderTables() {
    const get = str => XH.environmentService.get(str),
        row = (label, data) => {
            data = data || span({children: 'Not available', className: 'xh-text-color-muted'});
            return tr(th(label), td(data));
        };

    // Snapshot versions are tagged with a timestamp - show that in local time here
    // to aid in identifying when/if a snapshot has been updated.
    let hrVersion = get('hoistReactVersion');
    if (hrVersion.includes('SNAPSHOT.')) {
        const snapDate = new Date(parseInt(hrVersion.split('SNAPSHOT.')[1]));
        hrVersion += ` (${fmtDateTime(snapDate, {asHtml: true})})`;
    }

    return [
        table({
            children: tbody(
                row('App Name / Code', `${get('appName')} / ${get('appCode')}`),
                row('Environment', get('appEnvironment')),
                row('Instance Name', XH.environmentService.serverInstance),
                row('Database', get('databaseConnectionString')),
                row(
                    'DB User / Create Mode',
                    `${get('databaseUser')} / ${get('databaseCreateMode')}`
                ),
                row('App Time Zone', fmtTimeZone(get('appTimeZone'), get('appTimeZoneOffset'))),
                row(
                    'Server Time Zone',
                    fmtTimeZone(get('serverTimeZone'), get('serverTimeZoneOffset'))
                ),
                row(
                    'Client Time Zone',
                    fmtTimeZone(get('clientTimeZone'), get('clientTimeZoneOffset'))
                )
            )
        }),
        h2(Icon.books(), 'Application and Library Versions'),
        table({
            children: tbody(
                row('UI Server', `${get('appVersion')} (build ${get('appBuild')})`),
                row('Hoist Core', get('hoistCoreVersion')),
                row('Grails', get('grailsVersion')),
                row('Java', get('javaVersion'))
            )
        }),
        table({
            children: tbody(
                row('JS Client', `${get('clientVersion')} (build ${get('clientBuild')})`),
                row('Hoist React', hrVersion),
                row('React', get('reactVersion')),
                row('ag-Grid', get('agGridVersion')),
                row('MobX', get('mobxVersion'))
            )
        })
    ];
}

function renderBlurb() {
    return hbox({
        className: 'xh-admin-about-panel__blurb',
        children: [
            xhLogo(),
            div(
                p(
                    'Built with Hoist, a toolkit for rapid application development from ',
                    a({
                        href: 'https://xh.io',
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        children: 'Extremely Heavy'
                    }),
                    '.'
                ),
                p(
                    'Please contact ',
                    a({href: 'mailto:support@xh.io', children: 'support@xh.io'}),
                    ' with any questions.'
                )
            )
        ]
    });
}
