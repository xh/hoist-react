/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {PersistableState, PersistenceProvider} from '@xh/hoist/core';
import {isObject} from 'lodash';
import {GridModel} from '../GridModel';
import {GridModelPersistOptions} from '../Types';

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
                getPersistableState: () => new PersistableState(gridModel.persistableColumnState),
                setPersistableState: ({value}) => gridModel.setColumnState(value)
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
}
