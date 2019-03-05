/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel,  managed} from '@xh/hoist/core';
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

    @managed
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
            leftSorted: true,
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
            {leftValues, rightValues} = lrModel,
            cols = gridModel.columnState;

        const colChanges = [];
        cols.forEach(({colId, hidden}) => {
            if (leftValues.includes(colId) && !hidden) {
                colChanges.push({colId, hidden: true});
            } else if (rightValues.includes(colId) && hidden) {
                colChanges.push({colId, hidden: false});
            }
        });

        gridModel.applyColumnStateChanges(colChanges);
    }

    //------------------------
    // Implementation
    //------------------------
    syncChooserData() {
        const {gridModel, lrModel} = this;

        const data = gridModel.getLeafColumns().map(it => {
            const visible = gridModel.isColumnVisible(it.colId);
            return {
                value: it.colId,
                text: it.chooserName,
                description: it.chooserDescription,
                group: it.chooserGroup,
                exclude: it.excludeFromChooser,
                locked: visible && !it.hideable,
                side: visible ? 'right' : 'left'
            };
        });

        lrModel.setData(data);
    }
}
