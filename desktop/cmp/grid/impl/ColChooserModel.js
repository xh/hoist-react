/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {LeftRightChooserModel} from '@xh/hoist/desktop/cmp/leftrightchooser';
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

    async restoreDefaultsAsync() {
        const restored = await this.gridModel.restoreDefaultsAsync();
        if (restored) {
            this.syncChooserData();
        }
    }

    //------------------------
    // Implementation
    //------------------------
    syncChooserData() {
        const {gridModel, lrModel} = this,
            columns = gridModel.getLeafColumns(),
            hasGrouping = columns.some(it => it.chooserGroup);

        const data = columns.map(it => {
            const visible = gridModel.isColumnVisible(it.colId);
            return {
                value: it.colId,
                text: it.chooserName,
                description: it.chooserDescription,
                group: hasGrouping ? (it.chooserGroup ?? 'Ungrouped') : null,
                exclude: it.excludeFromChooser,
                locked: visible && !it.hideable,
                side: visible ? 'right' : 'left'
            };
        });

        lrModel.setData(data);
    }
}
