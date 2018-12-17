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
import PT from 'prop-types';

@HoistComponent
@LayoutSupport
export class RestGrid extends Component {

    static modelClass = RestGridModel;

    static propTypes = {
        /**
         *
         * This constitutes an 'escape hatch' for applications that need to get to the underlying
         * ag-Grid API.  It should be used with care. Settings made here might be overwritten and/or
         * interfere with the implementation of this component and its use of the ag-Grid API.
         */
        agOptions: PT.object,

        /** Optional components rendered adjacent to the top toolbar's action buttons */
        extraToolbarItems: PT.array,

        /**
         * Callback to call when a row is double clicked. Function will receive an event
         * with a data node containing the row's data.
         */
        onRowDoubleClicked: PT.func
    };

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

        const {readonly, formModel} = this.model;
        if (!readonly) {
            formModel.openEdit(row.data);
        } else {
            formModel.openView(row.data);
        }
    }
}
export const restGrid = elemFactory(RestGrid);