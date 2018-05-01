/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {box, vbox, hbox, h3} from 'hoist/layout';
import {wrapperPanel} from '../impl/WrapperPanel';
import './Layouts.scss';

@hoistComponent()
export class HboxLayoutPanel extends Component {
    render() {
        return wrapperPanel(
            vbox({
                width: 500,
                height: '80%',
                cls: 'xh-toolbox-hbox-panel',
                items: [
                    h3('Hbox Layout'),
                    this.renderExample()
                ]
            })
        );
    }

    renderExample() {
        return hbox({
            cls: 'xh-toolbox-example-container',
            flex: 1,
            items: [
                box({
                    flex: 1,
                    margin: 5,
                    item: 'flex: 1'
                }),
                box({
                    width: 100,
                    margin: 5,
                    item: 'width: 100'
                }),
                box({
                    flex: 2,
                    margin: 5,
                    item: 'flex: 2'
                })]
        });
    }
}