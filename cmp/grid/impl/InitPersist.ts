/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PersistableState, PersistenceProvider, persistOptions} from '@xh/hoist/core';
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
        PersistenceProvider.create({
            persistOptions: persistOptions(
                {path: `${path}.columns`},
                rootPersistWith,
                isObject(persistColumns) ? persistColumns : null
            ),
            target: {
                getPersistableState: () =>
                    new PersistableColumnState(gridModel.persistableColumnState),
                setPersistableState: ({value}) =>
                    runInAction(() => {
                        gridModel.setColumnState(value);
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
        PersistenceProvider.create({
            persistOptions: persistOptions(
                {path: `${path}.sortBy`},
                rootPersistWith,
                isObject(persistSort) ? persistSort : null
            ),
            target: {
                getPersistableState: () =>
                    new PersistableState(gridModel.sortBy.map(it => it.toString())),
                setPersistableState: ({value}) => gridModel.setSortBy(value)
            },
            owner: gridModel
        });
    }

    if (persistGrouping) {
        PersistenceProvider.create({
            persistOptions: persistOptions(
                {path: `${path}.groupBy`},
                rootPersistWith,
                isObject(persistGrouping) ? persistGrouping : null
            ),
            target: {
                getPersistableState: () => new PersistableState(gridModel.groupBy),
                setPersistableState: ({value}) => gridModel.setGroupBy(value)
            },
            owner: gridModel
        });
    }

    if (persistExpandToLevel) {
        PersistenceProvider.create({
            persistOptions: persistOptions(
                {path: `${path}.expandLevel`},
                rootPersistWith,
                isObject(persistExpandToLevel) ? persistExpandToLevel : null
            ),
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
