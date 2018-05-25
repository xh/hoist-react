/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {defaults} from 'lodash';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {panel, fragment} from '@xh/hoist/cmp/layout';
import {message} from '@xh/hoist/cmp/message';

import {restGridToolbar} from './RestGridToolbar';
import {restForm} from './RestForm';

@HoistComponent()
export class RestGrid extends Component {

    render() {
        const {model} = this,
            {extraToolbarItems, agOptions} = this.props;

        return fragment(
            panel({
                tbar: restGridToolbar({model, extraToolbarItems}),
                item: grid({
                    model: model.gridModel,
                    onRowDoubleClicked: this.onRowDoubleClicked,
                    agOptions
                })
            }),
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