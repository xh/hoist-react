/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {debounced} from '@xh/hoist/utils/js';
import {cloneDeep, find, isUndefined, isEmpty, omit} from 'lodash';

/**
 * Model for serializing/de-serializing saved grid state across user browsing sessions
 * and applying saved state when initialized by its parent `GridModel`.
 *
 * GridModels can enable persistent grid state via their `stateModel` config, typically
 * provided as a simple string `gridId` to identify a given grid instance.
 *
 * It is not necessary to manually create instances of this class within an application.
 * @private
 */
@HoistModel
export class GridStateModel {

    /**
     * Version of grid state definitions currently supported by this model.
     * Increment *only* when we need to abandon all existing grid state that might be saved on
     * user workstations to ensure compatibility with a new serialization or approach.
     */
    static GRID_STATE_VERSION = 1;

    /** @member {GridModel} */
    gridModel;
    /** @member {string} */
    gridId;
    state = {};

    /**
     * @param {Object} c - GridStateModel configuration.
     * @param {string} c.gridId - unique identifier for a Grid instance.
     * @param {boolean} [c.trackColumns] - true to save state of columns,
     *      including visibility, ordering and pixel widths.
     * @param {boolean} [c.trackSort] - true to save sorting.
     * @param {boolean} [c.trackGrouping] - true to save column grouping.
     */
    constructor({gridId, trackColumns = true, trackSort = true, trackGrouping = true}) {
        this.gridId = gridId;
        this.trackColumns = trackColumns;
        this.trackSort = trackSort;
        this.trackGrouping = trackGrouping;
    }

    /**
     * Attach this object to a GridModel and have it observe / apply changes to tracked properties.
     * @param {GridModel} gridModel
     */
    init(gridModel) {
        this.gridModel = gridModel;
        this.state = cloneDeep(this.readState());

        if (this.trackColumns) {
            this.updateGridColumns();
            this.addReaction(this.columnReaction());
        }

        if (this.trackGrouping) {
            this.updateGridGroupBy();
            this.addReaction(this.groupReaction());
        }

        if (this.trackSort) {
            this.updateGridSort();
            this.addReaction(this.sortReaction());
        }
    }

    /**
     * Clear all state saved for the linked GridModel.
     * @see GridModel.restoreDefaults()
     */
    clear() {
        this.state = {};
        this.saveStateChange();
    }

    //----------------------
    // Templates
    //-----------------------
    get stateKey() {
        return `gridState.v${GridStateModel.GRID_STATE_VERSION}.${this.gridId}`;
    }

    readState() {
        return XH.localStorageService.get(this.stateKey, {});
    }

    writeState(state) {
        XH.localStorageService.set(this.stateKey, state);
    }

    clearState() {
        XH.localStorageService.clear(this.stateKey);
    }

    //--------------------------
    // Columns
    //--------------------------
    columnReaction() {
        return {
            track: () => this.gridModel.columnState,
            run: (columnState) => {
                this.state.columns = this.cleanColumnState(columnState);
                this.saveStateChange();
            }
        };
    }

    updateGridColumns() {
        const {gridModel, state} = this;
        if (!state.columns) return;

        const colState = this.cleanColumnState(state.columns);
        gridModel.applyColumnStateChanges(colState);
    }

    //--------------------------
    // Sort
    //--------------------------
    sortReaction() {
        const {gridModel} = this;
        return {
            track: () => gridModel.sortBy,
            run: () => {
                this.state.sortBy = gridModel.sortBy.map(it => it.toString());
                this.saveStateChange();
            }
        };
    }

    updateGridSort() {
        const {sortBy} = this.state;
        if (!isUndefined(sortBy)) this.gridModel.setSortBy(sortBy);
    }

    //--------------------------
    // Grouping
    //--------------------------
    groupReaction() {
        return {
            track: () => this.gridModel.groupBy,
            run: (groupBy) => {
                this.state.groupBy = groupBy;
                this.saveStateChange();
            }
        };
    }

    updateGridGroupBy() {
        const {groupBy} = this.state;
        if (!isUndefined(groupBy)) this.gridModel.setGroupBy(groupBy);
    }

    //--------------------------
    // Other Implementation
    //--------------------------
    cleanColumnState(columnState) {
        const {gridModel} = this,
            gridCols = gridModel.getLeafColumns();

        // REMOVE any state columns that are no longer found in the grid. These were likely saved
        // under a prior release of the app and have since been removed from the code.
        let ret = columnState.filter(({colId}) => gridModel.findColumn(gridCols, colId));

        // ADD any grid columns that are not found in state. These are newly added to the code.
        // Insert these columns in position based on the index at which they are defined.
        gridCols.forEach(({colId}, idx) => {
            if (!find(ret, {colId})) {
                ret.splice(idx, 0, {colId});
            }
        });

        // Remove the width from any non-resizable column - we don't want to track those widths as
        // they are set programmatically (e.g. fixed / action columns), and saved state should not
        // conflict with any code-level updates to their widths.
        ret = ret.map(state => {
            const col = gridModel.findColumn(gridCols, state.colId);
            return col.resizable ? state : omit(state, 'width');
        });

        return ret;
    }

    @debounced(500)
    saveStateChange() {
        const {state} = this;

        if (isEmpty(state)) {
            this.clearState();
        } else {
            this.writeState(state);
        }
    }
}