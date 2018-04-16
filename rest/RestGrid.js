/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {defaults} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {grid} from 'hoist/grid';
import {frame, vframe, fragment} from 'hoist/layout';
import {message} from 'hoist/cmp';

import {restGridToolbar} from './RestGridToolbar';
import {restForm} from './RestForm';

@hoistComponent()
export class RestGrid extends Component {

    render() {
        const model = this.model,
            extraToolbarItems = this.props.extraToolbarItems,
            gridOptions = defaults(this.props.gridOptions, {onRowDoubleClicked: this.onRowDoubleClicked});
        return fragment(
            vframe(
                restGridToolbar({model, extraToolbarItems}),
                frame(
                    grid({
                        model: model.gridModel,
                        gridOptions: gridOptions
                    })
                )
            ),
            restForm({model: model.formModel}),
            message({model: model.messageModel})
        );
    }

    //------------------------
    // Implementation
    //------------------------
    onRowDoubleClicked = (row) => {
        if (!row.data) return;
        this.model.formModel.openEdit(row.data);
    }
}
export const restGrid = elemFactory(RestGrid);