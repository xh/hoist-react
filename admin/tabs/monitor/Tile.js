/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import './Tile.css';

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {div} from 'hoist/layout';

@hoistComponent()
export class Tile extends Component {
    render() {
        const {status, name, elapsed, metric, message} = this.props.check,
            tileClass = 'tile tile-' + status.toLowerCase();

        return div({
            cls: tileClass,
            items: [
                div({
                    cls: 'tile-name',
                    item: name
                }),
                div({
                    cls: 'tile-content',
                    items: [
                        div({cls: 'tile-metric', item: `Metric: ${metric}`}),
                        div({cls: 'tile-elapsed', item: `Elapsed: ${elapsed}ms`}),
                        div({cls: 'tile-message', item: `${message}`})
                    ]
                })
            ]
        });
    }
}
export const tile = elemFactory(Tile);