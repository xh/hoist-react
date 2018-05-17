/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from 'hoist/core';
import {hframe, vframe} from 'hoist/layout';
import {grid} from 'hoist/cmp/grid';

import {description} from './impl/Description';
import {chooserToolbar} from './impl/ChooserToolbar';
import './LeftRightChooser.scss';

/**
 * A component for moving a list of items between two arbitrary groups. By convention, the left
 * group represents 'available' items and the right group represents 'selected' items.
 * A nested panel is also available to display a more in-depth description for any selected item.
 * @see LeftRightChooserModel
 */
@HoistComponent()
class LeftRightChooser extends Component {

    render() {
        const {model} = this,
            {leftModel, rightModel} = model,
            agOptions = {
                rowSelection: 'multiple',
                rowDeselection: true,
                enableColResize: false,
                onRowDoubleClicked: (e) => model.moveRows([e.data])
            };

        return vframe({
            cls: 'xh-lr-chooser',
            items: [
                hframe({
                    cls: 'xh-lr-chooser__grid-frame',
                    items: [
                        grid({model: leftModel, agOptions}),
                        chooserToolbar({model}),
                        grid({model: rightModel, agOptions})
                    ]
                }),
                description({model})
            ]
        });
    }
}
export const leftRightChooser = elemFactory(LeftRightChooser);