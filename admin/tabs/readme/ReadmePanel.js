/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {div, h2} from 'hoist/layout';

@hoistComponent()
export class ReadmePanel extends Component {
    render() {
        return div({
            style: {padding: 'var(--xh-pad-px)'},
            item: h2('Readme TODO')
        });
    }
}
