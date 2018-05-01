/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core/index';
import {box, vbox, h3} from 'hoist/layout/index';
import {wrapperPanel} from '../impl/WrapperPanel';
import './Box.scss';

@hoistComponent()
export class VboxContainerPanel extends Component {
    render() {
        return wrapperPanel(
            vbox({
                width: 500,
                height: '80%',
                cls: 'xh-toolbox-vboxcontainer-panel',
                items: [
                    h3('Vbox Container'),
                    this.renderExample()
                ]
            })
        );
    }

    renderExample() {
        return vbox({
            cls: 'xh-toolbox-example-container',
            flex: 1,
            items: [
                box({
                    flex: 1,
                    item: 'flex: 1'
                }),
                box({
                    height: 50,
                    item: 'height: 50'
                }),
                box({
                    flex: 2,
                    item: 'flex: 2'
                })]
        });
    }
}