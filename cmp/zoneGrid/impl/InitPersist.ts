/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PersistableState, PersistenceProvider, persistOptions} from '@xh/hoist/core';
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
        PersistenceProvider.create({
            persistOptions: persistOptions(
                {path: `${path}.mappings`},
                rootPersistWith,
                isObject(persistMappings) ? persistMappings : null
            ),
            target: {
                getPersistableState: () => new PersistableState(zoneGridModel.mappings),
                setPersistableState: ({value}) => zoneGridModel.setMappings(value)
            },
            owner: zoneGridModel
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
                getPersistableState: () => new PersistableState(zoneGridModel.groupBy),
                setPersistableState: ({value}) => zoneGridModel.setGroupBy(value)
            },
            owner: zoneGridModel
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
                getPersistableState: () => new PersistableState(zoneGridModel.sortBy?.toString()),
                setPersistableState: ({value}) => zoneGridModel.setSortBy(value)
            },
            owner: zoneGridModel
        });
    }
}
