/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from 'hoist/core';
import {LeftRightChooserModel} from 'hoist/cmp/leftRightChooser/LeftRightChooserModel';
import {action, observable} from 'hoist/mobx';

/**
 * Core Model for a Grid, specifying the grid's data store, column definitions,
 * sorting/grouping/selection state, and context menu configuration.
 */
@HoistModel()
export class GridColumnChooserModel {

    leftRightChooserModel = null;

    @observable isOpen = false;

    constructor(parent) {
        this.parent = parent;
        this.leftRightChooserModel = new LeftRightChooserModel({
            leftTitle: 'Available Columns',
            rightTitle: 'Visible Columns'
        });
    }

    @action
    open() {
        this.syncChooserData();
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

    commit() {
        const grid = this.parent,
            model = this.leftRightChooserModel,
            {leftValues, rightValues} = model;

        const cols = grid.cloneColumns();
        cols.forEach(it => {
            if (leftValues.includes(it.field)) {
                it.hide = true;
            } else if (rightValues.includes(it.field)) {
                it.hide = false;
            }
        });

        grid.setColumns(cols);
    }


    //------------------------
    // Implementation
    //------------------------
    syncChooserData() {
        const grid = this.parent,
            cols = grid.columns;

        const data = cols.map(it=> {
            return {
                value: it.field,
                text: it.text,
                description: it.description,
                locked: it.locked,
                group: it.chooserGroup,
                exclude: it.excludeFromChooser,
                side: it.hide ? 'left' : 'right'
            };
        });

        this.leftRightChooserModel.setData(data);
    }
}
