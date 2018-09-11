/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {LeftRightChooserModel} from '@xh/hoist/desktop/cmp/leftrightchooser';

/**
 * State management for the ColChooser component.
 *
 * It is not necessary to manually create instances of this class within an application.
 * @private
 */
@HoistModel
export class ColChooserModel {

    gridModel = null;
    lrModel = null;

    @observable isOpen = false;

    /**
     * @param {GridModel} gridModel - model for the grid to be managed.
     */
    constructor(gridModel) {
        this.gridModel = gridModel;
        this.lrModel = new LeftRightChooserModel({
            leftTitle: 'Available Columns',
            rightTitle: 'Displayed Columns',
            leftSortBy: 'text',
            rightGroupingEnabled: false
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
                text: it.chooserName,
                description: it.chooserDescription,
                group: it.chooserGroup,
                exclude: it.excludeFromChooser,
                locked: !it.hide && !it.hideable,
                side: it.hide ? 'left' : 'right'
            };
        });

        lrModel.setData(data);
    }

    destroy() {
        XH.safeDestroy(this.lrModel);
    }
}
