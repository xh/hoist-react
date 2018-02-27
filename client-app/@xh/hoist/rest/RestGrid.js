/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {grid} from 'hoist/grid';
import {frame, vframe} from 'hoist/layout';
import {confirm} from 'hoist/cmp';

import {restGridToolbar} from './RestGridToolbar';
import {restForm} from './RestForm';

@hoistComponent()
export class RestGrid extends Component {

    render() {
        const model = this.model;
        return vframe(
            restGridToolbar({model}),
            frame(
                grid({
                    model: model.gridModel,
                    gridOptions: {
                        onRowDoubleClicked: this.onRowDoubleClicked
                    }
                })
            ),
            restForm({model: model.formModel}),
            confirm({model: model.confirmModel})
        );
    }

    //------------------------
    // Implementation
    //------------------------
    onRowDoubleClicked = (row) => {
        this.model.formModel.openEdit(row.data);
    }
}
export const restGrid = elemFactory(RestGrid);