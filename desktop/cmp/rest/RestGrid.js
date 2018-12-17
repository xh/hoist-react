/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory, LayoutSupport} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {fragment} from '@xh/hoist/cmp/layout';

import {restGridToolbar} from './impl/RestGridToolbar';
import {restForm} from './impl/RestForm';
import {RestGridModel} from './RestGridModel';

@HoistComponent
@LayoutSupport
export class RestGrid extends Component {

    static modelClass = RestGridModel;

    baseClassName = 'xh-rest-grid';

    render() {
        const {model} = this,
            {extraToolbarItems, onRowDoubleClicked = this.onRowDoubleClicked, agOptions} = this.props;

        return fragment(
            panel({
                ...this.getLayoutProps(),
                className: this.getClassName(),
                tbar: restGridToolbar({model, extraToolbarItems}),
                item: grid({
                    model: model.gridModel,
                    onRowDoubleClicked,
                    agOptions
                })
            }),
            restForm({model: model.formModel})
        );
    }

    //------------------------
    // Implementation
    //------------------------
    onRowDoubleClicked = (row) => {
        if (!row.data) return;

        const {editable, formModel} = this.model;
        if (editable) {
            formModel.openEdit(row.data);
        } else {
            formModel.openView(row.data);
        }
    }
}
export const restGrid = elemFactory(RestGrid);