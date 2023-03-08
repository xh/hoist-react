/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import { GridModel } from '@xh/hoist/cmp/grid';
import {HoistModel, managed} from '@xh/hoist/core';
import {LeftRightChooserModel} from '@xh/hoist/desktop/cmp/leftrightchooser';
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * State management for the ColChooser component.
 * @internal
 */
export class ColChooserModel extends HoistModel {
    override xhImpl = true;

    gridModel: GridModel;
    @managed lrModel: LeftRightChooserModel;

    // Show in dialog
    @observable isOpen = false;

    // Show in popover
    @observable isPopoverOpen = false;

    commitOnChange: boolean;
    showRestoreDefaults: boolean;
    autosizeOnCommit: boolean;
    width: number;
    height: number;

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

        this.lrModel = new LeftRightChooserModel({
            leftTitle: 'Available Columns',
            leftEmptyText: 'No more columns to add.',
            rightTitle: 'Displayed Columns',
            rightEmptyText: 'No columns will be visible.',
            leftSorted: true,
            rightGroupingEnabled: false,
            onChange: () => {
                if (this.commitOnChange) this.commit();
            },
            xhImpl: true
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
        const {gridModel, lrModel, autosizeOnCommit} = this,
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
            } as const;
        });

        lrModel.setData(data);
    }
}
