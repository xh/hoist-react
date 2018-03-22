/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {vbox, div} from 'hoist/layout';
import {Icon} from 'hoist/icon';

import './Tile.scss';

@hoistComponent()
export class Tile extends Component {
    render() {
        const {status, name, elapsed, metric, message} = this.props.check,
            tileClass = 'xh-status-tile xh-status-tile-' + status.toLowerCase();

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
                        Icon[this.getStatusIcon(status)]({size: '8x', prefix: 'fal'}),
                        div({cls: 'xh-status-tile__elapsed', item: `Elapsed: ${elapsed}ms`}),
                        div({cls: 'xh-status-tile__metric', item: `Metric: ${metric}`, hidden: !metric}),
                        div({cls: 'xh-status-tile__message', item: `${message}`, hidden: !message})
                    ]
                })
            ]
        });
    }

    getStatusIcon(status) {
        switch (status) {
            case 'OK':
                return 'check';
            case 'WARN':
                return 'warning';
            case 'FAIL':
                return 'error';
            case 'INACTIVE':
                return 'disabled';
            default:
                return 'disabled';
        }
    }
}
export const tile = elemFactory(Tile);