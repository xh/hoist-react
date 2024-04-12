/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {div, vbox} from '@xh/hoist/cmp/layout';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon, IconProps} from '@xh/hoist/icon';
import {pluralize} from '@xh/hoist/utils/js';
import './Tile.scss';

export const tile = hoistCmp.factory(props => {
    const {name, status, masterOnly, lastStatusChanged, results} = props.monitorResult,
        {icon, statusText} = statusProperties(status),
        tileClass = 'xh-status-tile xh-status-tile-' + status.toLowerCase(),
        relativeString = getRelativeTimestamp(lastStatusChanged, {pastSuffix: ''});
    if (masterOnly) {
        const masterResult = results[0].result;
        const {checksInStatus, metric, metricUnit, message} = masterResult;
        return panel({
            title: name,
            className: tileClass,
            items: [
                vbox({
                    className: 'xh-status-tile__content',
                    items: [
                        icon,
                        div({
                            className: 'xh-status-tile__elapsed',
                            item: `${statusText} for ${relativeString} (${pluralize(
                                'check',
                                checksInStatus,
                                true
                            )})`,
                            hidden: !!status.match('UNKNOWN|INACTIVE')
                        }),
                        div({
                            className: 'xh-status-tile__metric',
                            item: `${metric} ${metricUnit || ''}`,
                            hidden: metric == null
                        }),
                        div({
                            className: 'xh-status-tile__message',
                            item: `${message}`,
                            hidden: !message
                        })
                    ]
                })
            ],
            modelConfig: {modalSupport: true, collapsible: false, resizable: false}
        });
    }
    return panel({
        title: name,
        className: tileClass,
        items: [
            vbox({
                className: 'xh-status-tile__content',
                items: [
                    icon,
                    div({
                        className: 'xh-status-tile__elapsed',
                        item: `${statusText} for ${relativeString} (${pluralize(
                            'check',
                            results.map(it => it.result.checksInStatus).reduce((a, b) => a + b, 0),
                            true
                        )})`,
                        hidden: !!status.match('UNKNOWN|INACTIVE')
                    }),
                    results.map(it => {
                        const {server} = it;
                        return div({
                            className: 'xh-status-tile__server',
                            item: server,
                            hidden: server == null
                        });
                    }),
                    results.map(it => {
                        const {result} = it;
                        return div({
                            className: 'xh-status-tile__metric',
                            item: `${result.metric} ${result.metricUnit || ''}`,
                            hidden: result.metric == null
                        });
                    }),
                    results.map(it => {
                        const {result} = it;
                        return div({
                            className: 'xh-status-tile__message',
                            item: `${result.message}`,
                            hidden: !result.message
                        });
                    })
                ]
            })
        ],
        modelConfig: {modalSupport: true, collapsible: false, resizable: false}
    });
});

function statusProperties(status) {
    const iCfg: IconProps = {size: '8x', prefix: 'fal'};
    switch (status) {
        case 'OK':
            return {statusText: 'OK', icon: Icon.checkCircle(iCfg)};
        case 'WARN':
            return {statusText: 'Warning', icon: Icon.warning(iCfg)};
        case 'FAIL':
            return {statusText: 'Failing', icon: Icon.error(iCfg)};
        case 'INACTIVE':
            return {statusText: 'Inactive', icon: Icon.disabled(iCfg)};
        default:
            return {statusText: 'Unknown', icon: Icon.disabled(iCfg)};
    }
}
