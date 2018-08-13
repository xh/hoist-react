/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {cloneDeep, debounce, find} from 'lodash';
import {start} from '@xh/hoist/promise';

@HoistModel()
export class GridStateModel {

    // Version of grid state.  Increment *only* when we need to abandon all existing grid state in the wild.
    static gridStateVersion = 1;
    static stateKeyPrefix = 'gridState';

    gridModel = null;
    xhStateId = null;

    state = {};
    defaultState = null;

    /**
     * @param {object} config
     * @param {string} config.xhStateId - Unique grid identifier.
     * @param {boolean} [config.trackColumns] - Set to true to save state of columns (including ordering, and widths).
     * @param {boolean} [config.trackSort] - Set to true to save sorting.
     */
    constructor({xhStateId, trackColumns = true, trackSort = true}) {
        this.xhStateId = xhStateId;
        this.trackColumns = trackColumns;
        this.trackSort = trackSort;
    }

    init(gridModel) {
        this.gridModel = gridModel;

        if (this.trackColumns) {
            this.addReaction(this.columnReaction());
        }

        if (this.trackSort) {
            this.addReaction(this.sortReaction());
        }

        this.initializeState();
    }

    getStateKey() {
        const {stateKeyPrefix, gridStateVersion} = GridStateModel;
        return `${stateKeyPrefix}.v${gridStateVersion}.${this.xhStateId}`;
    }

    readState(stateKey) {
        return XH.localStorageService.get(stateKey, {});
    }

    saveState(stateKey, state) {
        XH.localStorageService.set(stateKey, state);
    }

    resetState(stateKey) {
        XH.localStorageService.remove(stateKey);
    }

    resetStateAsync() {
        return start(() => {
            this.loadState(this.defaultState);
            this.resetState(this.getStateKey());
        });
    }

    static clearState() {
        XH.localStorageService.keys().forEach(key => {
            if (key.startsWith(GridStateModel.stateKeyPrefix)) {
                XH.localStorageService.remove(key);
            }
        });
    }

    //--------------------------
    // Implementation
    //--------------------------
    initializeState() {
        const userState = this.readState(this.getStateKey());
        this.defaultState = this.readStateFromGrid();

        this.loadState(userState);
    }

    readStateFromGrid() {
        return {
            columns: this.getColumnState(),
            sortBy: this.gridModel.sortBy
        };
    }

    loadState(state) {
        this.state = cloneDeep(state);
        if (this.trackColumns) this.updateGridColumns();
        if (this.trackSort) this.updateGridSort();
    }

    //--------------------------
    // Columns
    //--------------------------
    columnReaction() {
        const {gridModel} = this;
        return {
            track: () => gridModel.columns,
            run: () => {
                this.state.columns = this.getColumnState();
                this.saveStateChange();
            }
        };
    }

    getColumnState() {
        const {columns} = this.gridModel;

        return columns.map(it => {
            return {
                colId: it.colId,
                hide: it.hide,
                width: it.width
            };
        });
    }

    updateGridColumns() {
        const {gridModel, state} = this,
            cols = gridModel.cloneColumns(),
            foundColumns = [];

        if (!state.columns) return;

        // Match columns in state to columns in code, apply stateful properties, and add to new columns in stateful order.
        state.columns.forEach(colState => {
            const col = find(cols, {colId: colState.colId});
            if (!col) return; // Do not attempt to include stale column state.

            col.hide = colState.hide;
            col.width = colState.width;
            foundColumns.push(col);
        });

        // Any grid columns that were not found in state are newly added to the code.
        // Insert these columns in position based on the index at which they are defined.
        const newColumns = [...foundColumns];
        cols.forEach((col, idx) => {
            if (!find(foundColumns, {colId: col.colId})) {
                newColumns.splice(idx, 0, col);
            }
        });

        gridModel.setColumns(newColumns);
    }

    //--------------------------
    // Sort
    //--------------------------
    sortReaction() {
        const {gridModel} = this;
        return {
            track: () => gridModel.sortBy,
            run: () => {
                this.state.sortBy = gridModel.sortBy;
                this.saveStateChange();
            }
        };
    }

    updateGridSort() {
        const {sortBy} = this.state;
        if (sortBy) this.gridModel.setSortBy(sortBy);
    }

    //--------------------------
    // Helper
    //--------------------------
    saveStateChange = debounce(() => {
        this.saveState(this.getStateKey(), this.state);
    }, 500);
}