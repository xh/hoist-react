/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {cloneDeep, debounce, find} from 'lodash';
import {start} from '@xh/hoist/promise';

/**
 * Model for serializing/de-serializing saved grid state across user browsing sessions
 * and applying saved state to its parent GridModel upon that model's construction.
 *
 * GridModels can enable persistent grid state via their stateModel config, typically
 * provided as a simple string `gridId` to identify a given grid instance.
 *
 * It is not necessary to manually create instances of this class within an application.
 * @private
 */
@HoistModel()
export class GridStateModel {

    /**
     * Version of grid state definitions currently supported by this model.
     * Increment *only* when we need to abandon all existing grid state that might be saved on
     * user workstations to ensure compatibility with a new serialization or approach.
     */
    static GRID_STATE_VERSION = 1;
    static STATE_SAVE_DEBOUNCE_MS = 500;

    gridModel = null;
    gridId = null;

    state = {};
    defaultState = null;

    /**
     * @param {Object} c - GridStateModel configuration.
     * @param {string} c.gridId - unique identifier for a Grid instance.
     * @param {boolean} [c.trackColumns] - true to save state of columns,
     *      including visibility, ordering and pixel widths.
     * @param {boolean} [c.trackSort] - true to save sorting.
     */
    constructor({gridId, trackColumns = true, trackSort = true}) {
        this.gridId = gridId;
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
        return `gridState.v${GridStateModel.GRID_STATE_VERSION}.${this.gridId}`;
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
        const {columns} = this.gridModel,
            cols = this.gatherLeaves(columns);

        return cols.map(col => {
            return {colId: col.colId, hide: col.hide, width: col.width};
        });
    }

    // Grouped columns are a tree structure but we store their state as a flat array of configs representing the leaves
    gatherLeaves(columns, leaves = []) {
        columns.forEach(col => {
            if (col.groupId) this.gatherLeaves(col.children, leaves);
            if (col.colId) leaves.push(col);
        });
        return leaves;
    }

    updateGridColumns() {
        const {gridModel, state} = this,
            gridCols = gridModel.cloneColumns(),
            cols = this.gatherLeaves(gridCols),
            foundColumns = [];

        if (!state.columns) return;

        // Match columns in state to model columns via colId, apply stateful properties,
        // then add to new columns in stateful order.
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

        gridModel.applyColumnChanges(newColumns);
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
    }, GridStateModel.STATE_SAVE_DEBOUNCE_MS);
}