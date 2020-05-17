/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {debounced} from '@xh/hoist/utils/js';
import {cloneDeep, find, isUndefined, isEmpty, omit} from 'lodash';
import {StateProvider} from '../../stateprovider';

/**
 * Model for serializing/de-serializing saved grid state across user browsing sessions
 * and applying saved state when initialized by its parent `GridModel`.
 *
 * Applications can enable persistent grid state via providing a configuration for this
 * object to the GridModel's `stateModel` config.  Applications should not create
 * instances of this class directly.
 *
 * @private
 */
@HoistModel
export class GridStateModel {

    /**
     * Version of grid state definitions currently supported by this model.
     * Increment *only* when we need to abandon all existing grid state to ensure compatibility
     * with a new serialization or approach.
     */
    VERSION = 1;

    /** @member {GridModel} */
    gridModel;
    /** @member {StateProvider} */
    provider;

    state = {};

    /**
     * @param {Object} c - GridStateModel configuration.
     * @param {GridModel} c.gridModel - owning GridModel whose state is being managed by this object.
     * @param {(StateProvider|Object)} c.provider - provider for storing and loading state.
     *     May be provided as a StateProvider, or a config object for one. See StateProvider.create.
     * @param {boolean} [c.trackColumns] - true to save state of columns,
     *      including visibility, ordering and pixel widths.
     * @param {boolean} [c.trackSort] - true to save sorting.
     * @param {boolean} [c.trackGrouping] - true to save column grouping.
     */
    constructor({
        gridModel,
        provider,
        trackColumns = true,
        trackSort = true,
        trackGrouping = true
    }) {
        this.gridModel = gridModel;
        this.provider = provider instanceof StateProvider ? provider : StateProvider.create(provider);
        this.trackColumns = trackColumns;
        this.trackGrouping = trackGrouping;
        this.trackSort = trackSort;

        const state = this.provider.readState();
        this.state = state?.version === this.VERSION ? cloneDeep(state) : {};

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
        const {state, provider} = this;

        if (isEmpty(state)) {
            provider.clearState();
        } else {
            state.version = this.VERSION;
            provider.writeState(state);
        }
    }
}