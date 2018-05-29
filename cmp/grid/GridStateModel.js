/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {cloneDeep, debounce, find, uniqBy} from 'lodash';

@HoistModel()
export class GridStateModel {
    parent = null;
    xhStateId = null;

    state = {};
    defaultState = null;

    /**
    * @param {string} xhStateId - Unique grid identifier.
    * @param {string} [trackColumns] - Save column visible state and ordering.
    * @param {string} [trackSort] - Save grid sort.
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

        // simplify as above
        if (this.trackSort) {
            this.addReaction(this.sortReaction());
        }

        this.initializeState();
    }

    initializeState() {
        const userState = this.readState(this.getStateKey());
        this.defaultState = this.readStateFromGrid(); // for resetting?

        this.loadState(userState);
    }

    readStateFromGrid() {
        return {
            columns: this.getColumnState(),
            sortBy: this.parent.sortBy
        };
    }


    //--------------------------
    // For Extension / Override
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
    columnReaction() {
        const {parent} = this;
        return {
            track: () => [parent.columns],
            run: () => {
                this.state.columns = this.getColumnState();
                this.saveStateChange();
            }
        };
    }

    getColumnState() {
        if (!this.trackColumns) return undefined;

        const columns = this.parent.columns,
            ret = columns.map(it => {
                const colSpec = {
                    xhId: it.xhId,
                    // hidden: it.isHidden() && (!groupField || it.dataIndex != groupField)  // See Hoist #425 sencha specific?
                    hide: it.hide,
                    width: it.width
                };

                return colSpec;
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
                col.width = colState.width; // if column is fixed width should we still do this? What if it wasn't fixed but is now?
                newColumns.push(col);
                foundColumns.push(col);
            });

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
        const sortBy = this.state.sortBy,
            cols = this.parent.columns,
            gridHasCol = sortBy ? sortBy.some(it => find(cols, {field: it.colId})) : false; // might be pointless, doesn't hurt anything to just let it go

        if (sortBy && gridHasCol) this.parent.setSortBy(sortBy);
    }

    //--------------------------
    // Helper
    //--------------------------
    saveStateChange = debounce(function() {
        this.saveState(this.getStateKey(), this.state);
    }, 500);

    getStateKey() {
        const xhStateId = this.xhStateId;
        if (!xhStateId) {
            throw XH.exception('GridStateModel must have a xhStateId in order to store state');
        }
        return 'gridState.' + xhStateId;
    }

    ensureCompatible() {
        const cols = this.parent.columns,
            colsWithoutXhId = cols.filter(col => !col.xhId),
            uniqueIds = cols.length == uniqBy(cols, 'xhId').length;

        if (this.trackColumns && (colsWithoutXhId.length || !uniqueIds)) {
            throw XH.exception('GridStateModel with "trackColumns=true" requires all columns to have a unique xhId');
        }
    }

}