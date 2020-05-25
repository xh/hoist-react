/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {cloneDeep, find, isUndefined, omit} from 'lodash';
import {Persistor} from '@xh/hoist/persistence/impl/Persistor';
import {PersistenceProvider} from '@xh/hoist/persistence';

/**
 * Model to manage persisting state from  GridModel.
 *
 * @private
 */
@HoistModel
export class PersistenceModel {

    // Version of state definitions currently supported by this model.  Increment to abandon state.
    VERSION = 1;
    gridModel;

    @managed
    persistor;

    @observable.ref
    state = {};

    @action
    hydrateState(state) {
        this.state = state?.version === this.VERSION ? cloneDeep(state) : {version: this.VERSION};
    }

    constructor(
        gridModel,
        persistWith,
        {
            path = 'gridModel',
            persistColumns = true,
            persistGrouping = true,
            persistSort = true
        } = {}
    ) {
        this.gridModel = gridModel;
        this.state = {version: this.VERSION};

        this.provider = persistWith.isPersistenceProvider ? persistWith : PersistenceProvider.create(persistWith);

        this.persistor = new Persistor({
            pvd: this.provider,
            pvdPath: path,
            obj: this,
            objPath: 'state'
        });

        if (persistColumns) {
            this.updateGridColumns();
            this.addReaction(this.columnReaction());
        }

        if (persistGrouping) {
            this.updateGridGroupBy();
            this.addReaction(this.groupReaction());
        }

        if (persistSort) {
            this.updateGridSort();
            this.addReaction(this.sortReaction());
        }
    }

    @action
    clear() {
        this.state = {version: this.VERSION};
    }

    //--------------------------
    // Columns
    //--------------------------
    columnReaction() {
        return {
            track: () => this.gridModel.columnState,
            run: (columnState) => {
                this.writeState({columns: this.cleanColumnState(columnState)});
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
                this.writeState({sortBy: gridModel.sortBy.map(it => it.toString())});
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
                this.writeState({groupBy});
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

    @action
    writeState(updates) {
        this.state = {...this.state, ...updates};
    }
}