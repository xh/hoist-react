/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, PersistenceProvider, XH} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isUndefined} from 'lodash';


/**
 * Model to manage persisting state from GridModel.
 * @private
 */
export class GridPersistenceModel extends HoistModel {

    VERSION = 1;  // Increment to abandon state.

    /** @member {GridModel} */
    gridModel;

    /** @member {Object} */
    @observable.ref
    state;

    /** @member {PersistenceProvider} */
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
        const {gridModel} = this;
        return {
            track: () => [gridModel.columnState, gridModel.autosizeState],
            run: ([columnState, autosizeState]) => {
                this.patchState({
                    columns: gridModel.removeTransientWidths(columnState),
                    autosize: autosizeState
                });
            }
        };
    }

    updateGridColumns() {
        const {columns, autosize} = this.state;
        if (!isUndefined(columns)) this.gridModel.setColumnState(columns);
        if (!isUndefined(autosize)) this.gridModel.setAutosizeState(autosize);
    }

    //--------------------------
    // Sort
    //--------------------------
    sortReaction() {
        return {
            track: () => this.gridModel.sortBy,
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
