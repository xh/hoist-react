/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core/index';
import {hbox, vbox, box, h3} from 'hoist/layout/index';
import {resizable} from 'hoist/cmp/resizable';
import {wrapperPanel} from '../impl/WrapperPanel';

@hoistComponent()
export class ResizableContainerPanel extends Component {
    render() {
        return wrapperPanel(
            vbox({
                width: 500,
                height: 400,
                cls: 'xh-toolbox-resizablecontainer-panel',
                items: [
                    h3('TabPanel Container'),
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
                hbox({
                    flex: 1,
                    items: [
                        resizable({
                            side: 'right',
                            contentSize: 125,
                            isOpen: true,
                            item: box('Collapsible Left')
                        }),
                        box('Main Content')
                    ]
                }),
                resizable({
                    side: 'top',
                    contentSize: 100,
                    isOpen: true,
                    item: box('Collapsible Bottom')
                })
            ]
        });
    }
}