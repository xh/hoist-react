/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {MonitorResult, MonitorResults, MonitorStatus} from './Types';
import {div, hbox, hspacer, span, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {hoistCmp, PlainObject} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon, IconProps} from '@xh/hoist/icon';
import './Tile.scss';
import {sortBy} from 'lodash';

export const tile = hoistCmp.factory(props => {
    let {name, status, lastStatusChanged, metricUnit, results} = props.results as MonitorResults,
        {statusText} = statusProperties(status),
        tileClass = 'xh-status-tile xh-status-tile-' + status.toLowerCase(),
        instanceResults = sortBy(results, instanceSortOrder);

    if (status != 'INACTIVE' && status != 'UNKNOWN') {
        statusText += getRelativeTimestamp(lastStatusChanged, {
            pastSuffix: '',
            prefix: ' for',
            epsilon: null
        });
    }

    return panel({
        title: name,
        className: tileClass,
        modelConfig: {
            modalSupport: {width: 600, height: 400},
            collapsible: false,
            resizable: false
        },
        item: div({
            className: 'xh-status-tile__content',
            item: vbox(
                statusText,
                vspacer(5),
                ...instanceResults.map(result => instanceRow({result, metricUnit}))
            )
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
