/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {find, isUndefined, omit} from 'lodash';
import {PersistenceProvider, LocalStorageProvider} from '@xh/hoist/persistence';

/**
 * Model to manage persisting state from GridModel.
 *
 * @private
 */
@HoistModel
export class GridPersistenceModel {

    VERSION = 1;  // Increment to abandon state.
    gridModel;
    path;

    @observable.ref
    state;

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
        this.path = path;

        // 1) Read state from and attach to provider -- fail gently
        try {
            const provider = PersistenceProvider.getOrCreate(persistWith);
            this.state = (
                this.loadState(provider) ??
                this.legacyState(provider) ??
                {version: this.VERSION}
            );
            this.addReaction({
                track: () => this.state,
                run: (state) => provider.write(path, state),
                debounce: 500
            });
        } catch (e) {
            console.error(e);
            this.state = {version: this.VERSION};
        }

        // 2) Bind self to grid, and populate grid.
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

    loadState(provider) {
        const ret = provider.read(this.path);
        return ret?.version === this.VERSION ? ret : null;
    }

    legacyState(provider) {
        if (this.VERSION === 1 && provider instanceof LocalStorageProvider) {
            const legacyKey = 'gridState.v1.' + provider.key,
                data = XH.localStorageService.get(legacyKey);
            if (data) {
                provider.write(this.path, {...data, version: this.VERSION});
                XH.localStorageService.remove(legacyKey);
                return data;
            }
        }
        return null;
    }
}