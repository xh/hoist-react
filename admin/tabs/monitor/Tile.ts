/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {MonitorResult, MonitorResults, MonitorStatus} from './Types';
import {div, hbox, hspacer, span, vbox} from '@xh/hoist/cmp/layout';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {hoistCmp, PlainObject} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon, IconProps} from '@xh/hoist/icon';
import './Tile.scss';
import {sortBy} from 'lodash';

export const tile = hoistCmp.factory(props => {
    const {name, status, lastStatusChanged, metricUnit, results} = props.results as MonitorResults,
        {statusText} = statusProperties(status),
        tileClass = 'xh-status-tile xh-status-tile-' + status.toLowerCase(),
        relativeString = getRelativeTimestamp(lastStatusChanged, {pastSuffix: ''}),
        instanceResults = sortBy(results, instanceSortOrder);

    return panel({
        title: name,
        className: tileClass,
        modelConfig: {modalSupport: true, collapsible: false, resizable: false},
        item: vbox({
            className: 'xh-status-tile__content',
            items: [
                div({
                    className: 'xh-status-tile__elapsed',
                    item: `${statusText} for ${relativeString}`,
                    hidden: status === 'INACTIVE' || status === 'UNKNOWN'
                }),
                ...instanceResults.map(result => instanceRow({result, metricUnit}))
            ]
        })
    });
});

const instanceRow = hoistCmp.factory(({result, metricUnit}) => {
    const {instance, metric, message, status} = result as MonitorResult,
        {icon} = statusProperties(status),
        metricText = metric != null ? `${metric} ${metricUnit ?? ''}` : null;
    return hbox({
        className: 'xh-status-tile__instance-row xh-status-tile-' + status.toLowerCase(),
        alignItems: 'start',
        items: [
            icon,
            hspacer(5),
            span({
                className: 'xh-status-tile__instance-name',
                item: instance
            }),
            hspacer(10),
            div(div(metricText), div(message))
        ]
    });
});

function statusProperties(status: MonitorStatus): PlainObject {
    const cfg: IconProps = {prefix: 'fal'};
    switch (status) {
        case 'OK':
            return {statusText: 'OK', icon: Icon.checkCircle(cfg)};
        case 'WARN':
            return {statusText: 'Warning', icon: Icon.warning(cfg)};
        case 'FAIL':
            return {statusText: 'Failing', icon: Icon.error(cfg)};
        case 'INACTIVE':
            return {statusText: 'Inactive', icon: Icon.disabled(cfg)};
        default:
            return {statusText: 'Unknown', icon: Icon.disabled(cfg)};
    }
}

function instanceSortOrder(result: MonitorResult) {
    const {status, primary} = result,
        primaryBump = primary ? -0.5 : 0;
    switch (status) {
        case 'FAIL':
            return -3 + primaryBump;
        case 'WARN':
            return -2 + primaryBump;
        case 'OK':
            return -1 + primaryBump;
        default:
            return primaryBump;
    }
}
