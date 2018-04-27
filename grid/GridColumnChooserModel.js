/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, setter} from 'hoist/mobx';
import {LeftRightChooserModel} from 'hoist/cmp/leftRightChooser/LeftRightChooserModel';

/**
 * Core Model for a Grid, specifying the grid's data store, column definitions,
 * sorting/grouping/selection state, and context menu configuration.
 */
export class GridColumnChooserModel {

    leftRightChooserModel = null;

    @observable @setter isOpen = false;


    constructor({
        parent=null
    }) {
        this.parent = parent;
    }

    init() {
        const data = this.prepareChooserData();
        this.leftRightChooserModel = new LeftRightChooserModel({
            data: data
        });

    }

    onClose = ()=> {
        this.commit();
    };


    //---------
    // implementation
    //---------

    prepareChooserData() {
        const grid = this.parent,
            cols = grid.columns,
            api = grid.gridApi.gridCore.columnApi;

        return cols.map(it=> {
            return {
                value: it.field,
                text: it.headerName,
                side: api.getColumn(it.field).visible ? 'right' : 'left'
            };
        });
    }


    commit() {
        const grid = this.parent,
            api = grid.gridApi.gridCore.columnApi;

        const model = this.leftRightChooserModel,
            {leftModel, rightModel} = model,
            hidden = leftModel.store.allRecords,
            visible = rightModel.store.allRecords;

        api.setColumnsVisible(hidden.map(it => it.value), false);
        api.setColumnsVisible(visible.map(it => it.value), true);

    }
}
