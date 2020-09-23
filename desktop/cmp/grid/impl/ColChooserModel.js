/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {LeftRightChooserModel} from '@xh/hoist/desktop/cmp/leftrightchooser';
import {Icon} from '@xh/hoist/icon';
import {action, observable} from '@xh/hoist/mobx';

/**
 * State management for the ColChooser component.
 *
 * It is not necessary to manually create instances of this class within an application.
 * @private
 */
@HoistModel
export class ColChooserModel {

    gridModel;
    @managed lrModel;

    // Show in dialog
    @observable isOpen = false;

    // Show in popover
    @observable isPopoverOpen = false;

    commitOnChange;
    showRestoreDefaults;

    /**
     * @param {Object} c - ColChooserModel config
     * @param {GridModel} c.gridModel - model for the grid to be managed.
     * @param {boolean} [c.commitOnChange] - Immediately render changed columns on grid.
     *      Set to false to enable Save button for committing changes on save.
     * @param {boolean} [c.showRestoreDefaults] - show Restore Defaults button.
     *      Set to false to hide Restore Grid Defaults button, which immediately
     *      commits grid defaults (all column, grouping, and sorting states).
     * @param {number} [c.width] - chooser width for popover and dialog.
     * @param {number} [c.height] - chooser height for popover and dialog.
     */
    constructor({
        gridModel,
        commitOnChange = true,
        showRestoreDefaults = true,
        width = 520,
        height = 300
    }) {
        this.gridModel = gridModel;

        this.commitOnChange = commitOnChange;
        this.showRestoreDefaults = showRestoreDefaults;

        this.width = width;
        this.height = height;

        this.lrModel = new LeftRightChooserModel({
            leftTitle: 'Available Columns',
            leftEmptyText: 'No more columns to add.',
            rightTitle: 'Displayed Columns',
            rightEmptyText: 'No columns will be visible.',
            leftSorted: true,
            rightGroupingEnabled: false,
            onChange: () => {
                if (this.commitOnChange) this.commit();
            }
        });
    }

    @action
    open() {
        this.syncChooserData();
        this.isOpen = true;
    }

    @action
    openPopover() {
        this.syncChooserData();
        this.isPopoverOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
        this.isPopoverOpen = false;
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

    // When commitOnChange is set to false, confirm with user before proceeding.
    confirmRestoreDefaults() {
        XH.confirm({
            title: 'Please Confirm',
            icon: Icon.warning({size: 'lg'}),
            message: 'Restoring grid defaults will take place immediately. Do you wish to proceed?',
            onConfirm: () => this.restoreDefaults()
        });
    }

    restoreDefaults() {
        this.gridModel.restoreDefaults();
        this.syncChooserData();
        this.commit();
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
