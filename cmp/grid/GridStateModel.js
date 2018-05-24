/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {cloneDeep, find} from 'lodash';

@HoistModel()
export class GridStateModel {

    trackColumns = true;
    trackSort = true;

    parent = null;
    xhStateId = null;

    state = {};
    userState = null;
    defaultState = null;


    constructor({trackColumns, trackSort, xhStateId}) {
        this.trackColumns = trackColumns;
        this.trackSort = trackSort;
        this.xhStateId = xhStateId;
    }

    init(gridModel) {
        this.parent = gridModel;

        this.ensureCompatible();

        if (this.trackColumns) {
            this.addReaction({
                track: () => [gridModel.columns, gridModel.gridColumnOrder], // 'columns' observable is not changed on reorder
                run: this.onColumnsChanged // firing on load due to first state setting of columns, is this a problem?
            });
        }

        if (this.trackSort) {
            this.addReaction({
                track: () => gridModel.sortBy,
                run: this.onSortChanged
            });
        }

        this.initializeState();
    }

    initializeState() {
        this.userState = this.readState(this.getStateKey());
        this.defaultState = this.readStateFromGrid(); // for resetting?

        this.loadState(this.userState);
    }

    readStateFromGrid() {
        return {
            columns: this.getColumnState(),
            sortBy: this.parent.sortBy
        };
    }


    //--------------------------
    // For Extension / Override // ??? really?
    //--------------------------
    readState(stateKey) {
        return XH.localStorageService.get(stateKey, {});
    }

    saveState(stateKey, state) {
        XH.localStorageService.set(stateKey, state);
    }

    resetState(stateKey) {
        XH.localStorageService.remove(stateKey);
    }


    loadState(state) {
        this.state = cloneDeep(state || this.readState(this.getStateKey()) || {});
        this.updateGridColumns();
        this.updateGridSort();
    }


    //--------------------------
    // Columns
    //--------------------------
    onColumnsChanged() {
        if (this.trackColumns) { // don't think I need this check. the 'listener' isn't added if not
            this.state.columns = this.getColumnState();
            this.saveStateChange();
        }
    }

    getColumnState() {
        if (!this.trackColumns) return undefined;

        const gridModel = this.parent,
            colOrder = gridModel.gridColumnOrder,
            orderedCols = [];

        colOrder.forEach(field => {
            const col = find(gridModel.columns, {field});
            orderedCols.push(col);
        });

        const ret = orderedCols.map(it => {
            const colSpec = {
                xhId: it.xhId,
                // hidden: it.isHidden() && (!groupField || it.dataIndex != groupField)  // See Hoist #425 sencha specific?
                hide: it.hide
            };

            if (it.xhId != null) { // do we need this? (we check in ensureCompatible)
                return colSpec;
            }
        });

        return ret;
    }

    updateGridColumns() {
        const {parent, state} = this,
            cols = parent.cloneColumns(),
            newColumns = [],
            foundColumns = [];

        if (this.trackColumns && state.columns) {
            state.columns.forEach(colState => {
                const col = find(cols, {xhId: colState.xhId});
                if (!col) return;

                col.hide = colState.hide;
                newColumns.push(col);
                foundColumns.push(col);
            });

            cols.forEach((col, idx) => {
                if (!find(foundColumns, {xhId: col.xhId})) {
                    newColumns.splice(idx, 0, col);
                }
            });

            parent.setGridColumnOrder(newColumns);
            parent.setColumns(newColumns);
        }

    }

    //--------------------------
    // Sort
    //--------------------------
    onSortChanged() {
        if (this.trackSort) { // see onColumnChanged above
            this.state.sortBy = this.parent.sortBy;
            this.saveStateChange();
        }
    }

    updateGridSort() {
        const sortBy = this.state.sortBy,
            cols = this.parent.columns,
            gridHasCol = sortBy ? sortBy.some(it => find(cols, {field: it.colId})) : false;

        if (sortBy && gridHasCol) this.parent.setSortBy(sortBy);
    }

    //--------------------------
    // Helper
    //--------------------------
    saveStateChange() {
        if (this.state && !this._resetting) { // ??
            this.saveState(this.getStateKey(), this.state);
        }
    }

    getStateKey() {
        const xhStateId = this.xhStateId;
        if (!xhStateId) {
            throw XH.exception('GridStateModel must have a xhStateId in order to store state');
        }
        return 'gridState.' + xhStateId;
    }

    ensureCompatible() {
        const cols = this.parent.columns,
            colsWithoutXhId = cols.filter(col => !col.xhId);

        if (this.trackColumns && colsWithoutXhId.length) {
            throw XH.exception('GridStateModel with "trackColumns=true" requires all columns to have an xhId');
        }
    }

}