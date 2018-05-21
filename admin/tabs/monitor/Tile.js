/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {vbox, div} from '@xh/hoist/cmp/layout';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {pluralize} from '@xh/hoist/utils/JsUtils';
import {Icon} from '@xh/hoist/icon';

import './Tile.scss';

@HoistComponent()
export class Tile extends Component {
    render() {
        const {checksInStatus, lastStatusChanged, metric, metricUnit, message, name, status} = this.props.check,
            {icon, statusText} = this.statusProperties(status),
            tileClass = 'xh-status-tile xh-status-tile-' + status.toLowerCase(),
            relativeString = getRelativeTimestamp(new Date(lastStatusChanged), {pastSuffix: ''});

        return vbox({
            cls: tileClass,
            items: [
                div({
                    cls: 'xh-status-tile__name',
                    item: name
                }),
                vbox({
                    cls: 'xh-status-tile__content',
                    items: [
                        icon,
                        div({
                            cls: 'xh-status-tile__elapsed',
                            item: `${statusText} for ${relativeString} (${pluralize('check', checksInStatus, true)})`,
                            hidden: !!status.match('UNKNOWN|INACTIVE')
                        }),
                        div({
                            cls: 'xh-status-tile__metric',
                            item: `${metric} ${metricUnit || ''}`,
                            hidden: metric == null
                        }),
                        div({
                            cls: 'xh-status-tile__message',
                            item: `${message}`,
                            hidden: !message
                        })
                    ]
                })
            ]
        });
    }

    statusProperties(status) {
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
}
export const tile = elemFactory(Tile);