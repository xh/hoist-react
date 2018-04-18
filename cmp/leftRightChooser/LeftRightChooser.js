/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {clone} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {vframe, hframe} from 'hoist/layout';
import {grid} from 'hoist/grid';
import {description} from './impl/Description';
import {chooserToolbar} from './impl/Toolbar';
import './LeftRightChooser.scss';

/**
 * A component for moving a list of items between two arbitrary groups. By convention, the left group represents
 * 'available' items and the right group represents 'selected' items. A description panel is also available
 * to give the user more in-depth information on each item.
 *
 * See also LeftRightChooserModel.
 */
@hoistComponent()
class LeftRightChooser extends Component {

    render() {
        const {model} = this,
            {leftModel, rightModel} = model,
            gridOptions: {
                rowSelection: 'multiple',
                rowDeselection: true,
                enableColResize: false
            };

        return vframe({
            cls: 'xh-leftRightChooser',
            items: [
                hframe({
                    cls: 'gridContainer',
                    items: [
                        grid({model: leftModel, gridOptions}),
                        chooserToolbar({model}),
                        grid({model: rightModel, gridOptions})
                    ]
                }),
                description({model})
            ]
        });
    }
}
export const leftRightChooser = elemFactory(LeftRightChooser);