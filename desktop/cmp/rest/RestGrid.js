/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory, LayoutSupport} from '@xh/hoist/core';
import {grid} from '@xh/hoist/desktop/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {fragment} from '@xh/hoist/cmp/layout';

import {restGridToolbar} from './RestGridToolbar';
import {restForm} from './RestForm';

@HoistComponent()
@LayoutSupport
export class RestGrid extends Component {

    baseClassName = 'xh-rest-grid';

    render() {
        const {model} = this,
            {extraToolbarItems, agOptions} = this.props;

        return fragment(
            panel({
                ...this.getLayoutProps(),
                className: this.getClassName(),
                tbar: restGridToolbar({model, extraToolbarItems}),
                item: grid({
                    model: model.gridModel,
                    onRowDoubleClicked: this.onRowDoubleClicked,
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
        this.model.formModel.openEdit(row.data);
    }
}
export const restGrid = elemFactory(RestGrid);