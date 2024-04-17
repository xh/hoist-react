/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {div, hbox, vbox} from '@xh/hoist/cmp/layout';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon, IconProps} from '@xh/hoist/icon';
import './Tile.scss';

export const tile = hoistCmp.factory(props => {
    const {name, status, masterOnly, lastStatusChange, metricUnit, instanceResults} = props.info,
        {icon, statusText} = statusProperties(status),
        tileClass = 'xh-status-tile xh-status-tile-' + status.toLowerCase(),
        relativeString = getRelativeTimestamp(lastStatusChange, {pastSuffix: ''});

    return panel({
        title: masterOnly ? `${name} (Master Only)` : name,
        className: tileClass,
        items: [
            vbox({
                className: 'xh-status-tile__content',
                items: [
                    icon,
                    div({
                        className: 'xh-status-tile__elapsed',
                        item: `${statusText} for ${relativeString}`,
                        hidden: !!status.match('UNKNOWN|INACTIVE')
                    }),
                    div({
                        className: 'xh-status-tile__instance-result-block',
                        items: instanceResults
                            .filter(it => !['UNKNOWN', 'INACTIVE'].includes(it.status))
                            .map(it => {
                                const {icon, statusText} = statusProperties(it.status, 'lg');
                                const {instance, metric} = it;
                                return div({
                                    className: 'xh-status-tile__instance-result',
                                    items: [
                                        div({
                                            items: [
                                                hbox({
                                                    items: [
                                                        icon,
                                                        `Instance ${instance} ${statusText}`
                                                    ]
                                                }),
                                                `Last run ${getRelativeTimestamp(it.date, {pastSuffix: 'ago'})}`
                                            ]
                                        }),
                                        div({
                                            className: 'xh-status-tile__metric',
                                            item: `${+metric?.toFixed(2)} ${metricUnit || ''}`,
                                            hidden: metric === null
                                        })
                                    ]
                                });
                            })
                    })
                ]
            })
        ],
        modelConfig: {modalSupport: true, collapsible: false, resizable: false}
    });
});

function statusProperties(status, iconSize?) {
    const iCfg: IconProps = {size: iconSize || '8x', prefix: 'fal'};
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
