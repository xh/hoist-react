/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH, managed, PersistenceProvider} from '@xh/hoist/core';
import {observable, action, makeObservable} from '@xh/hoist/mobx';
import {find, isUndefined, omit} from 'lodash';


/**
 * Model to manage persisting state from GridModel.
 * @private
 */
export class GridPersistenceModel extends HoistModel {

    VERSION = 1;  // Increment to abandon state.
    gridModel;

    @observable.ref
    state;

    @managed
    provider;

    /**
     *
     * @param {GridModel} gridModel
     * @param {GridModelPersistOptions} persistWith
     */
    constructor(
        gridModel,
        {
            persistColumns = true,
            persistGrouping = true,
            persistSort = true,
            ...persistWith
        }
    ) {
        super();
        makeObservable(this);
        this.gridModel = gridModel;

        persistWith = {path: 'grid', ...persistWith};

        // 1) Read state from and attach to provider -- fail gently
        try {
            this.provider = PersistenceProvider.create(persistWith);
            this.state = this.loadState() ?? this.legacyState() ?? {version: this.VERSION};
            this.addReaction({
                track: () => this.state,
                run: (state) => this.provider.write(state)
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
                this.patchState({columns: this.cleanColumnState(columnState)});
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
            run: (sortBy) => {
                this.patchState({sortBy: sortBy.map(it => it.toString())});
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
                this.patchState({groupBy});
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
    patchState(updates) {
        this.state = {...this.state, ...updates};
    }

    loadState() {
        const ret = this.provider.read();
        return ret?.version === this.VERSION ? ret : null;
    }

    legacyState() {
        const {provider, VERSION} = this;
        if (VERSION === 1) {
            let legacyKey = provider.legacyStateKey ?? provider.key;
            if (legacyKey) {
                legacyKey = 'gridState.v1.' + legacyKey;
                let data = XH.localStorageService.get(legacyKey);
                if (data) {
                    data = {...data, version: VERSION};
                    provider.write(data);
                    XH.localStorageService.remove(legacyKey);
                    return data;
                }
            }
        }
        return null;
    }
}