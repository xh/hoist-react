/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {MonitorResult, MonitorResults, Status} from './Types';
import {div, hbox, vbox} from '@xh/hoist/cmp/layout';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {hoistCmp, PlainObject} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon, IconProps} from '@xh/hoist/icon';
import './Tile.scss';

export const tile = hoistCmp.factory(props => {
    const {name, status, primaryOnly, lastStatusChanged, metricUnit, results} =
            props.results as MonitorResults,
        {icon, statusText} = statusProperties(status),
        tileClass = 'xh-status-tile xh-status-tile-' + status.toLowerCase(),
        relativeString = getRelativeTimestamp(lastStatusChanged, {pastSuffix: ''});

    return panel({
        title: primaryOnly ? `${name} - Primary Only` : name,
        className: tileClass,
        items: [
            vbox({
                className: 'xh-status-tile__content',
                items: [
                    icon,
                    div({
                        className: 'xh-status-tile__elapsed',
                        item: `${statusText} for ${relativeString}`,
                        hidden: status === 'INACTIVE' || status === 'UNKNOWN'
                    }),
                    div({
                        className: 'xh-status-tile__instance-result-block',
                        items: results
                            .sort(it => instanceSortOrder(it))
                            .map(it => {
                                const {icon, statusText} = statusProperties(it.status, 'lg');
                                const {instance, metric} = it;
                                return div({
                                    className: 'xh-status-tile__instance-result',
                                    items: [
                                        div(hbox(icon, `${instance} ${statusText}`)),
                                        div({
                                            className: 'xh-status-tile__metric',
                                            item: `${metric} ${metricUnit || ''}`,
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

function statusProperties(status: Status, iconSize?: any): PlainObject {
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

function instanceSortOrder(result: MonitorResult) {
    const {status, primary} = result;
    let value = primary ? -0.5 : 0;
    switch (status) {
        case 'OK':
            return value + 1;
        case 'WARN':
            return value;
        case 'FAIL':
            return value - 1;
        default:
            return value + 2;
    }
}
