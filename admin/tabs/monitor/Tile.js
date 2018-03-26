/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {vbox, div} from 'hoist/layout';
import {getRelativeTimestamp} from 'hoist/cmp/form/RelativeTimestamp';
import {pluralize} from 'hoist/utils/JsUtils';
import {Icon} from 'hoist/icon';

import './Tile.scss';

@hoistComponent()
export class Tile extends Component {
    render() {
        const {checksInStatus, lastStatusChanged, metric, message, name, status} = this.props.check,
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
                        Icon[icon]({size: '8x', prefix: 'fal'}),
                        div({
                            cls: 'xh-status-tile__elapsed',
                            item: `${statusText} for ${relativeString} (${pluralize('check', checksInStatus, true)})`,
                            hidden: !!status.match('UNKNOWN|INACTIVE')
                        }),
                        div({
                            cls: 'xh-status-tile__metric',
                            item: `Metric: ${metric}`,
                            hidden: !metric
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
        switch (status) {
            case 'OK':
                return {statusText: 'OK', icon: 'check'};
            case 'WARN':
                return {statusText: 'Warning', icon: 'warning'};
            case 'FAIL':
                return {statusText: 'Failing', icon: 'error'};
            case 'INACTIVE':
                return {statusText: 'Inactive', icon: 'disabled'};
            default:
                return {statusText: 'Unknown', icon: 'disabled'};
        }
    }
}
export const tile = elemFactory(Tile);