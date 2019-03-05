/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {observable, settable, computed, action} from '@xh/hoist/mobx';
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

    @settable @observable.ref columns = [];
    @observable isOpen = false;

    @computed
    get pinnedColumns() {
        return this.columns.filter(it => it.pinned);
    }

    @computed
    get unpinnedColumns() {
        return this.columns.filter(it => !it.pinned);
    }

    /**
     * @param {GridModel} gridModel - model for the grid to be managed.
     */
    constructor(gridModel) {
        this.gridModel = gridModel;
        this.addReaction({
            track: () => XH.routerState,
            run: this.close
        });
    }

    restoreDefaults() {
        this.gridModel.stateModel.resetStateAsync().then(() => {
            this.syncChooserData();
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
        const columns = clone(this.columns),
            col = find(columns, {colId});

        if (!col || col.locked || col.exclude) return;

        col.hidden = hidden;
        this.setColumns(columns);
    }

    moveToIndex(colId, toIdx) {
        const columns = clone(this.columns),
            col = find(columns, {colId});

        if (!col || col.locked || col.exclude) return;

        const fromIdx = columns.indexOf(col);
        columns.splice(toIdx, 0, columns.splice(fromIdx, 1)[0]);
        this.setColumns(columns);
    }

    commit() {
        const colChanges = this.columns.map(it => {
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

        const columns = gridModel.columnState.map(({colId}) => {
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

        this.setColumns(columns);
    }
}
