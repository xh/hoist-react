/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PersistableState, PersistenceProvider} from '@xh/hoist/core';
import {isObject} from 'lodash';
import {ZoneGridModel} from '../ZoneGridModel';
import {ZoneGridModelPersistOptions} from '../Types';

/**
 * Initialize persistence for a {@link ZoneGridModel} by applying its `persistWith` config.
 * @internal
 */
export function initPersist(
    zoneGridModel: ZoneGridModel,
    {
        persistMappings = true,
        persistGrouping = true,
        persistSort = true,
        path = 'zoneGrid',
        ...rootPersistWith
    }: ZoneGridModelPersistOptions
) {
    if (persistMappings) {
        const persistWith = isObject(persistMappings)
            ? PersistenceProvider.mergePersistOptions(rootPersistWith, persistMappings)
            : rootPersistWith;
        PersistenceProvider.create({
            persistOptions: {
                path: `${path}.mappings`,
                ...persistWith
            },
            target: {
                getPersistableState: () => new PersistableState(zoneGridModel.mappings),
                setPersistableState: ({value}) => zoneGridModel.setMappings(value)
            },
            owner: zoneGridModel
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
                getPersistableState: () => new PersistableState(zoneGridModel.groupBy),
                setPersistableState: ({value}) => zoneGridModel.setGroupBy(value)
            },
            owner: zoneGridModel
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
                getPersistableState: () => new PersistableState(zoneGridModel.sortBy?.toString()),
                setPersistableState: ({value}) => zoneGridModel.setSortBy(value)
            },
            owner: zoneGridModel
        });
    }
}
