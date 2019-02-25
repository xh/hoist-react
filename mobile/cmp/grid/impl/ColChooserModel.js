/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {clone, find} from 'lodash';

/**
 * State management for the ColChooser component.
 *
 * It is not necessary to manually create instances of this class within an application.
 * @private
 */
@HoistModel
export class ColChooserModel {

    gridModel = null;

    @observable.ref data = [];
    @observable isOpen = false;

    /**
     * @param {GridModel} gridModel - model for the grid to be managed.
     */
    constructor(gridModel) {
        this.gridModel = gridModel;
        this.addReaction({
            track: () => XH.routerState,
            run: () => this.close()
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

    setHidden(colId, hidden) {
        const data = clone(this.data),
            col = find(data, {colId});

        if (!col || col.locked || col.exclude) return;

        col.hidden = hidden;
        this.setData(data);
    }

    moveToIndex(colId, toIdx) {
        const data = clone(this.data),
            col = find(data, {colId});

        if (!col || col.locked || col.exclude) return;

        // We don't allow moving to before pinned columns
        const pinnedCount = data.filter(it => it.pinned).length;
        if (toIdx < pinnedCount) return;

        const fromIdx = data.indexOf(col);
        data.splice(toIdx, 0, data.splice(fromIdx, 1)[0]);
        this.setData(data);
    }

    commit() {
        const colChanges = this.data.map(it => {
            const {colId, hidden} = it;
            return {colId, hidden};
        });
        this.gridModel.applyColumnStateChanges(colChanges);
    }

    //------------------------
    // Implementation
    //------------------------
    syncChooserData() {
        const {gridModel} = this,
            cols = gridModel.getLeafColumns();

        const data = gridModel.columnState.map(({colId}) => {
            const col = gridModel.findColumn(cols, colId),
                visible = gridModel.isColumnVisible(colId);

            return {
                colId: col.colId,
                text: col.chooserName,
                hidden: !visible,
                exclude: col.excludeFromChooser,
                locked: visible && !col.hideable,
                pinned: col.pinned
            };
        });

        this.setData(data);
    }

    @action
    setData(data) {
        this.data = data;
    }
}
