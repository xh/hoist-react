/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {cloneDeep, debounce, find, uniqBy} from 'lodash';
import {SECONDS} from '@xh/hoist/utils/DateTimeUtils';
import {start} from '@xh/hoist/promise';

@HoistModel()
export class GridStateModel {
    parent = null;
    xhStateId = null;

    state = {};
    defaultState = null;

    /**
    * @param {string} xhStateId - Unique grid identifier.
    * @param {string} [trackColumns] - Set to true to save column visible state and ordering.
    * @param {string} [trackSort] - Set to true to save sort.
    */
    constructor({xhStateId, trackColumns = true, trackSort = true}) {
        this.xhStateId = xhStateId;
        this.trackColumns = trackColumns;
        this.trackSort = trackSort;
    }

    init(gridModel) {
        this.parent = gridModel;

        this.ensureCompatible();

        if (this.trackColumns) {
            this.addReaction(this.columnReaction());
        }

        if (this.trackSort) {
            this.addReaction(this.sortReaction());
        }

        this.initializeState();
    }


    //--------------------------
    // For Extension / Override
    //--------------------------
    getStateKey() {
        const xhStateId = this.xhStateId;
        return 'gridState.' + xhStateId;
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
            sortBy: this.parent.sortBy
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
        const {parent} = this;
        return {
            track: () => parent.columns,
            run: () => {
                this.state.columns = this.getColumnState();
                this.saveStateChange();
            }
        };
    }

    getColumnState() {
        const {columns} = this.parent;

        return columns.map(it => {
            return {
                xhId: it.xhId,
                hide: it.hide,
                width: it.width
            };
        });
    }

    updateGridColumns() {
        const {parent, state} = this,
            cols = parent.cloneColumns(),
            newColumns = [],
            foundColumns = [];

        // Match columns in state to columns in code, apply stateful properties, and add to new columns in stateful order.
        if (state.columns) {
            state.columns.forEach(colState => {
                const col = find(cols, {xhId: colState.xhId});
                if (!col) return; // Do not attempt to include stale column state

                col.hide = colState.hide;
                newColumns.push(col);
                foundColumns.push(col);
            });

            // Any parent columns that were not found in state are newly added to the code.
            // Insert these columns in position based on the index at which they are defined.
            cols.forEach((col, idx) => {
                if (!find(foundColumns, {xhId: col.xhId})) {
                    newColumns.splice(idx, 0, col);
                }
            });

            parent.setColumns(newColumns);
        }

    }

    //--------------------------
    // Sort
    //--------------------------
    sortReaction() {
        const {parent} = this;
        return {
            track: () => parent.sortBy,
            run: () => {
                this.state.sortBy = parent.sortBy;
                this.saveStateChange();
            }
        };
    }

    updateGridSort() {
        const {sortBy} = this.state;
        if (sortBy) this.parent.setSortBy(sortBy);
    }

    //--------------------------
    // Helper
    //--------------------------
    saveStateChange = debounce(function() {
        this.saveState(this.getStateKey(), this.state);
    }, 5 * SECONDS);

    ensureCompatible() {
        const xhStateId = this.xhStateId,
            cols = this.parent.columns,
            colsWithoutXhId = cols.filter(col => !col.xhId),
            uniqueIds = cols.length == uniqBy(cols, 'xhId').length;

        if (!xhStateId) {
            throw XH.exception('GridStateModel must have a xhStateId in order to store state');
        }

        if (this.trackColumns && (colsWithoutXhId.length || !uniqueIds)) {
            throw XH.exception('GridStateModel with "trackColumns=true" requires all columns to have a unique xhId');
        }
    }

}