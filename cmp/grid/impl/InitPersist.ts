/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {PersistableState, PersistenceProvider} from '@xh/hoist/core';
import {isEqual, isObject} from 'lodash';
import {runInAction} from 'mobx';
import {GridModel} from '../GridModel';
import {ColumnState, GridModelPersistOptions} from '../Types';

/**
 * Initialize persistence for a {@link GridModel} by applying its `persistWith` config.
 * @internal
 */
export function initPersist(
    gridModel: GridModel,
    {
        persistColumns = true,
        persistGrouping = true,
        persistSort = true,
        persistExpandToLevel = true,
        path = 'grid',
        ...rootPersistWith
    }: GridModelPersistOptions
) {
    if (persistColumns) {
        const persistWith = isObject(persistColumns)
            ? PersistenceProvider.mergePersistOptions(rootPersistWith, persistColumns)
            : rootPersistWith;
        PersistenceProvider.create({
            persistOptions: {
                path: `${path}.columns`,
                ...persistWith
            },
            target: {
                getPersistableState: () =>
                    new PersistableColumnState(gridModel.persistableColumnState),
                setPersistableState: ({value}) =>
                    runInAction(() => {
                        // Set columnState directly since GridModel.setColumnState will merge the
                        // provided state with the current state, which is not what we want here.
                        gridModel.columnState = gridModel.cleanColumnState(value);
                        if (gridModel.autosizeOptions.mode === 'managed') {
                            const columns = gridModel.columnState
                                .filter(it => !it.manuallySized)
                                .map(it => it.colId);
                            gridModel.autosizeAsync({columns});
                        }
                    })
            },
            owner: gridModel
        });
    }

    if (persistSort) {
        const persistWith = isObject(persistSort)
            ? PersistenceProvider.mergePersistOptions(rootPersistWith, persistSort)
            : rootPersistWith;
        PersistenceProvider.create({
            persistOptions: {
                path: `${path}.sortBy`,
                persistDefaultValue: true,
                ...persistWith
            },
            target: {
                getPersistableState: () =>
                    new PersistableState(gridModel.sortBy.map(it => it.toString())),
                setPersistableState: ({value}) => gridModel.setSortBy(value)
            },
            owner: gridModel
        });
    }

    if (persistGrouping) {
        const persistWith = isObject(persistGrouping)
            ? PersistenceProvider.mergePersistOptions(rootPersistWith, persistGrouping)
            : rootPersistWith;
        PersistenceProvider.create({
            persistOptions: {
                path: `${path}.groupBy`,
                ...persistWith
            },
            target: {
                getPersistableState: () => new PersistableState(gridModel.groupBy),
                setPersistableState: ({value}) => gridModel.setGroupBy(value)
            },
            owner: gridModel
        });
    }

    if (persistExpandToLevel) {
        const persistWith = isObject(persistExpandToLevel)
            ? PersistenceProvider.mergePersistOptions(rootPersistWith, persistExpandToLevel)
            : rootPersistWith;
        PersistenceProvider.create({
            persistOptions: {
                path: `${path}.expandLevel`,
                ...persistWith
            },
            target: {
                getPersistableState: () => new PersistableState(gridModel.expandLevel),
                setPersistableState: ({value}) => gridModel.expandToLevel(value)
            },
            owner: gridModel
        });
    }
}

class PersistableColumnState extends PersistableState<ColumnState[]> {
    override equals(other: PersistableState<ColumnState[]>): boolean {
        return isEqual(
            this.value.filter(it => !it.hidden),
            other.value.filter(it => !it.hidden)
        );
    }
}
