/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {grid} from 'hoist/grid';

@hoistComponent()
class DataView extends Component {

    render() {
        const {gridModel} = this.model,
            {rowCls, rowHeight} = this.props;

        return grid({
            model: gridModel,
            gridOptions: {
                headerHeight: 0,
                rowClass: rowCls,
                // Note: Setting a fixed row height is required for now.
                // Ag-grid 17.1.x will introduce an 'autoHeight' property that will size rows according to content
                rowHeight: rowHeight
            }
        });
    }

}
export const dataView = elemFactory(DataView);