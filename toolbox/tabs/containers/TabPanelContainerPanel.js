/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core/index';
import {vbox, h3} from 'hoist/layout/index';
import {wrapperPanel} from '../impl/WrapperPanel';

@hoistComponent()
export class TabPanelContainerPanel extends Component {
    render() {
        return wrapperPanel(
            vbox({
                width: 500,
                height: '80%',
                cls: 'xh-toolbox-tabcontainer-panel',
                items: [
                    h3('TabPanel Container'),
                    this.renderExample()
                ]
            })
        );
    }

    renderExample() {
        return null;
    }
}