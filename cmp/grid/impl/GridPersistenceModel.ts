/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {GridSorterLike} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, PersistenceProvider, Some} from '@xh/hoist/core';
import {Persistable} from '@xh/hoist/core/persist/Persistable';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isUndefined} from 'lodash';
import {GridModel} from '../GridModel';
import {ColumnState, GridModelPersistOptions} from '../Types';

/**
 * State for GridModel persistence.
 * @internal
 */
export interface GridState {
    columns?: Partial<ColumnState>[];
    sortBy?: Some<GridSorterLike>;
    groupBy?: Some<string>;
    version?: number;
    autosize?: any;
}

/**
 * Model to manage persisting state from GridModel.
 * @internal
 */
export class GridPersistenceModel extends HoistModel implements Persistable<GridState> {
    override xhImpl = true;

    VERSION = 1; // Increment to abandon state.

    gridModel: GridModel;

    @observable.ref
    state: GridState = {version: this.VERSION};

    @managed
    provider: PersistenceProvider<GridState>;

    private readonly persistColumns: boolean;
    private readonly persistGrouping: boolean;
    private readonly persistSort: boolean;

    constructor(
        gridModel: GridModel,
        {
            persistColumns = true,
            persistGrouping = true,
            persistSort = true,
            ...persistWith
        }: GridModelPersistOptions
    ) {
        super();
        makeObservable(this);
        this.gridModel = gridModel;
        this.persistColumns = persistColumns;
        this.persistGrouping = persistGrouping;
        this.persistSort = persistSort;

        this.addReaction(this.columnReaction(), this.groupReaction(), this.sortReaction());

        try {
            this.provider = PersistenceProvider.create({path: 'grid', ...persistWith, bind: this});
        } catch (e) {
            this.logError(e);
            this.provider = null;
        }
    }

    //--------------------------
    // Persistable Interface
    //--------------------------
    getPersistableState(): GridState {
        return this.state;
    }

    setPersistableState(state: GridState) {
        if (state.version !== this.VERSION) return;

        if (this.persistColumns) {
            const {columns, autosize} = state;
            if (!isUndefined(columns)) this.gridModel.setColumnState(columns);
            if (!isUndefined(autosize)) this.gridModel.setAutosizeState(autosize);
        }

        if (this.persistSort) {
            const {sortBy} = state;
            if (!isUndefined(sortBy)) this.gridModel.setSortBy(sortBy);
        }

        if (this.persistGrouping) {
            const {groupBy} = state;
            if (!isUndefined(groupBy)) this.gridModel.setGroupBy(groupBy);
        }
    }

    //--------------------------
    // Reactions
    //--------------------------
    private columnReaction() {
        if (!this.persistColumns) return;
        const {gridModel} = this;
        return {
            track: () => [gridModel.columnState, gridModel.autosizeState],
            run: ([columnState, autosizeState]) => {
                this.patchState({
                    columns: gridModel.cleanColumnState(columnState),
                    autosize: autosizeState
                });
            },
            fireImmediately: true
        };
    }

    private sortReaction() {
        if (!this.persistSort) return;
        return {
            track: () => this.gridModel.sortBy,
            run: sortBy => {
                this.patchState({sortBy: sortBy.map(it => it.toString())});
            },
            fireImmediately: true
        };
    }

    private groupReaction() {
        if (!this.persistGrouping) return;
        return {
            track: () => this.gridModel.groupBy,
            run: groupBy => {
                this.patchState({groupBy});
            },
            fireImmediately: true
        };
    }

    //--------------------------
    // Other Implementation
    //--------------------------
    @action
    private patchState(updates) {
        this.state = {...this.state, ...updates};
    }
}
