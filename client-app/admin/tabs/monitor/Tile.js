/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import './Tile.css';

import {Component} from 'react';
import {div} from 'hoist/layout';
import {observer} from 'hoist/mobx';

@observer
export class Tile extends Component {
    render() {
        const {status, name, elapsed, metric, message} = this.props.check,
            tileClass = 'tile tile-' + status.toLowerCase();

        return div({
            cls: tileClass,
            items: [
                {
                    cls: 'tile-name',
                    items: name
                },
                {
                    cls: 'tile-content',
                    items: [
                        {cls: 'tile-metric', items: `Metric: ${metric}`},
                        {cls: 'tile-elapsed', items: `Elapsed: ${elapsed}ms`},
                        {cls: 'tile-message', items: `${message}`}
                    ]
                }
            ]
        });
    }
}