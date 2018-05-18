/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from 'hoist/core';
import {action, observable} from 'hoist/mobx';
import {LeftRightChooserModel} from 'hoist/cmp/leftrightchooser';

@HoistModel()
export class ColChooserModel {

    gridModel = null
    lrModel = null

    @observable isOpen = false

    constructor(gridModel) {
        this.gridModel = gridModel;
        this.lrModel = new LeftRightChooserModel({
            leftTitle: 'Available Columns',
            rightTitle: 'Displayed Columns'
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
        const {gridModel, lrModel} = this,
            {leftValues, rightValues} = lrModel;

        const cols = gridModel.cloneColumns();
        cols.forEach(it => {
            if (leftValues.includes(it.field)) {
                it.hide = true;
            } else if (rightValues.includes(it.field)) {
                it.hide = false;
            }
        });

        gridModel.setColumns(cols);
    }


    //------------------------
    // Implementation
    //------------------------
    syncChooserData() {
        const {gridModel, lrModel} = this;

        const data = gridModel.columns.map(it => {
            return {
                value: it.field,
                text: it.headerName,
                description: it.description,
                locked: it.locked,
                group: it.chooserGroup,
                exclude: it.excludeFromChooser,
                side: it.hide ? 'left' : 'right'
            };
        });

        lrModel.setData(data);
    }

    destroy() {
        XH.safeDestroy(this.lrModel);
    }
}
