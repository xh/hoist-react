/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {vbox, div} from '@xh/hoist/cmp/layout';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {pluralize} from '@xh/hoist/utils/js';
import {Icon} from '@xh/hoist/icon';

import './Tile.scss';

export const tile = hoistCmp.factory(
    (props) => {
        const {checksInStatus, lastStatusChanged, metric, metricUnit, message, name, status} = props.check,
            {icon, statusText} = statusProperties(status),
            tileClass = 'xh-status-tile xh-status-tile-' + status.toLowerCase(),
            relativeString = getRelativeTimestamp(new Date(lastStatusChanged), {pastSuffix: ''});

        return vbox({
            className: tileClass,
            items: [
                div({
                    className: 'xh-status-tile__name',
                    item: name
                }),
                vbox({
                    className: 'xh-status-tile__content',
                    items: [
                        icon,
                        div({
                            className: 'xh-status-tile__elapsed',
                            item: `${statusText} for ${relativeString} (${pluralize('check', checksInStatus, true)})`,
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
            ]
        });
    }
);

function statusProperties(status) {
    const iCfg = {size: '8x', prefix: 'fal'};
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