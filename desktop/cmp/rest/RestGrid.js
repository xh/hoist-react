/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {grid} from '@xh/hoist/desktop/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {fragment} from '@xh/hoist/cmp/layout';

import {restGridToolbar} from './RestGridToolbar';
import {restForm} from './RestForm';

@HoistComponent({layoutSupport: true})
export class RestGrid extends Component {

    render() {
        const {model} = this,
            {layoutConfig, extraToolbarItems, agOptions} = this.props;

        return fragment(
            panel({
                layoutConfig,
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