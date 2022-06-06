/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {LRChooserModel} from './impl';
import {action, observable, makeObservable} from '@xh/hoist/mobx';

/**
 * State management for the ColChooser component.
 *
 * It is not necessary to manually create instances of this class within an application.
 * @private
 */
export class ColChooserModel extends HoistModel {

    gridModel;
    @managed lrModel;

    // Show in dialog
    @observable isOpen = false;

    // Show in popover
    @observable isPopoverOpen = false;

    commitOnChange;
    showRestoreDefaults;
    autosizeOnCommit;

    constructor({
        gridModel,
        commitOnChange = true,
        showRestoreDefaults = true,
        autosizeOnCommit = false,
        width = !commitOnChange && showRestoreDefaults ? 600 : 520,
        height = 300
    }) {
        super();
        makeObservable(this);
        this.gridModel = gridModel;
        this.commitOnChange = commitOnChange;
        this.showRestoreDefaults = showRestoreDefaults;
        this.autosizeOnCommit = autosizeOnCommit;
        this.width = width;
        this.height = height;
    }

    @action
    open() {
        this.createLRModel();
        this.isOpen = true;
    }

    @action
    openPopover() {
        this.createLRModel();
        this.isPopoverOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
        this.isPopoverOpen = false;
    }

    commit() {
        const {gridModel, lrModel, autosizeOnCommit} = this,
            {leftValues, rightValues} = lrModel,
            colChanges = [];

        leftValues.forEach(col => {
            colChanges.push({colId: col, hidden: true});
        });
        rightValues.forEach(col => {
            colChanges.push({colId: col, hidden: false});
        });
        // must push missing leaf column
        colChanges.push({
            colId: 'winLose',
            hidden: true
        });

        gridModel.applyColumnStateChanges(colChanges);
        if (autosizeOnCommit && colChanges.length) gridModel.autosizeAsync({showMask: true});
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
    createLRModel() {
        XH.destroy(this.lrModel);
        this.lrModel = new LRChooserModel({
            leftTitle: 'Available Columns',
            leftEmptyText: 'No more columns to add.',
            rightTitle: 'Displayed Columns',
            rightEmptyText: 'No columns will be visible.',
            leftSorted: true,
            onChange: () => {
                if (this.commitOnChange) this.commit();
            }
        });

        const {gridModel, lrModel} = this,
            columns = gridModel.getLeafColumns(),
            colIds = gridModel.columnState.map(col => col.colId),
            data = columns.map(it => {
                const visible = gridModel.isColumnVisible(it.colId);
                return {
                    value: it.colId,
                    text: it.chooserName,
                    description: it.chooserDescription,
                    exclude: it.excludeFromChooser,
                    locked: visible && !it.hideable,
                    side: visible ? 'right' : 'left',
                    sortOrder: colIds.indexOf(it.colId)
                };
            });

        lrModel.setData(data);
    }
}
