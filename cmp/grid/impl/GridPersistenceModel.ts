/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {GridSorterLike} from '@xh/hoist/cmp/grid';
import {HoistModel, PersistableState, PersistenceProvider, Some} from '@xh/hoist/core';
import {Persistable} from '@xh/hoist/core/persist/Persistable';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isUndefined} from 'lodash';
import {GridModel} from '../GridModel';
import {ColumnState, GridModelPersistOptions} from '../Types';

/**
 * Model to manage persisting state from GridModel.
 * @internal
 */
export class GridPersistenceModel extends HoistModel implements Persistable<GridPersistState> {
    override xhImpl = true;

    private readonly VERSION = 1; // Increment to abandon state.
    private readonly gridModel: GridModel;
    private readonly persistColumns: boolean;
    private readonly persistGrouping: boolean;
    private readonly persistSort: boolean;

    @observable.ref
    private state: GridPersistState = {version: this.VERSION};

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

        if (persistColumns) {
            this.patchState({columns: gridModel.persistableColumnState});
        }

        if (persistSort) {
            this.patchState({sortBy: gridModel.sortBy.map(it => it.toString())});
        }

        if (persistGrouping) {
            this.patchState({groupBy: gridModel.groupBy});
        }

        const provider = PersistenceProvider.create({
            persistOptions: {
                path: 'grid',
                ...persistWith
            },
            target: this
        });

        if (provider) {
            if (persistColumns) {
                this.addReaction(this.columnReaction());
            }

            if (persistSort) {
                this.addReaction(this.sortReaction());
            }

            if (persistGrouping) {
                this.addReaction(this.groupReaction());
            }
        }
    }

    //--------------------------
    // Persistable Interface
    //--------------------------
    getDefaultPersistableState(): PersistableState<GridPersistState> {
        return this.getPersistableState();
    }

    getPersistableState(): PersistableState<GridPersistState> {
        return new PersistableState(this.state);
    }

    setPersistableState(persistableState: PersistableState<GridPersistState>) {
        const state = persistableState.value;
        if (state.version !== this.VERSION) return;

        if (this.persistColumns) {
            const {columns} = state;
            if (!isUndefined(columns)) this.gridModel.setColumnState(columns);
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
        const {gridModel} = this;
        return {
            track: () => gridModel.persistableColumnState,
            run: columnState => {
                this.patchState({
                    columns: columnState
                });
            }
        };
    }

    private sortReaction() {
        return {
            track: () => this.gridModel.sortBy,
            run: sortBy => {
                this.patchState({sortBy: sortBy.map(it => it.toString())});
            }
        };
    }

    private groupReaction() {
        return {
            track: () => this.gridModel.groupBy,
            run: groupBy => {
                this.patchState({groupBy});
            }
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

interface GridPersistState {
    columns?: Partial<ColumnState>[];
    sortBy?: Some<GridSorterLike>;
    groupBy?: Some<string>;
    version?: number;
}
