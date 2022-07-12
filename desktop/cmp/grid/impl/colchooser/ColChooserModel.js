/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {LRChooserModel} from './impl';
import {isEmpty} from 'lodash';
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

        this.lrModel = new LRChooserModel({
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
            {leftLeaves, rightLeaves} = lrModel,
            colChanges = [];

        leftLeaves.forEach(col => {
                colChanges.push({colId: col, hidden: true});
            });
        rightLeaves.forEach(col => {
                colChanges.push({colId: col, hidden: false});
            });

        gridModel.applyColumnStateChanges(colChanges);
        if (autosizeOnCommit && colChanges.length) gridModel.autosizeAsync({showMask: true});
    }

    async restoreDefaultsAsync() {
        const restored = await this.gridModel.restoreDefaultsAsync();
        if (restored) {
            this.createLRModel();
        }
    }

    //------------------------
    // Implementation
    //------------------------
    createLRModel() {
        XH.safeDestroy(this.lrModel);
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

        const rightData = this.createChooserData('right');
        const leftData = this.createChooserData('left');
        this.lrModel.setData([...leftData, ...rightData]);
    }


    // Translate array of columnGroups and columns into tree structure for colChooser rows
    createChooserData(side) {
        const {gridModel} = this,
            allColumns = gridModel.columns,
            colIds = gridModel.columnState.map(col => col.colId);

        const processColumns = (cols, path) => {
            const ret = [];
            cols.forEach((col) => {
                if (col.children) {
                    // create a group node
                    const id = `${path}>>${col.groupId}`;
                    const children = processColumns(col.children, id);
                    if (!isEmpty(children)) {
                        // add the node if it has children
                        ret.push({
                            id,
                            name: col.groupId,
                            text: col.groupId,
                            children,
                            side,
                            sortOrder: children[0].sortOrder
                        });
                    }
                } else {
                    // create a leaf node
                    const visible = gridModel.isColumnVisible(col.colId),
                        id = `${path}>>${col.colId}`;
                    if (side === 'right' && visible) {
                        // if we are constructing the right tree, we are looking for visible cols
                        ret.push({
                            id,
                            value: col.colId,
                            text: col.chooserName,
                            description: col.chooserDescription,
                            exclude: col.excludeFromChooser,
                            locked: visible && !col.hideable,
                            sortOrder: colIds.indexOf(col.colId),
                            isLeaf: true,
                            side
                        });
                    } else if (side === 'left' && !visible) {
                        // if we are constructing the left tree, we are looking for hidden cols
                        ret.push({
                            id,
                            value: col.colId,
                            text: col.chooserName,
                            description: col.chooserDescription,
                            exclude: col.excludeFromChooser,
                            locked: visible && !col.hideable,
                            isLeaf: true,
                            side
                        });
                    }
                }
            });
            return ret;
        };
        return processColumns(allColumns, 'root');
    }
}
