/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, PersistableState, PersistenceProvider} from '@xh/hoist/core';
import {isObject} from 'lodash';
import {ZoneGridModel} from '../ZoneGridModel';
import {ZoneGridModelPersistOptions} from '../Types';

/**
 * Model to manage persisting state from ZoneGridModel.
 * @internal
 */
export class ZoneGridPersistenceModel extends HoistModel {
    override xhImpl = true;

    constructor(
        zoneGridModel: ZoneGridModel,
        {
            persistMapping = true,
            persistGrouping = true,
            persistSort = true,
            path = 'zoneGrid',
            ...rootPersistWith
        }: ZoneGridModelPersistOptions
    ) {
        super();

        if (persistMapping) {
            const persistWith = isObject(persistMapping) ? persistMapping : rootPersistWith;
            PersistenceProvider.create({
                persistOptions: {
                    path: `${path}.mappings`,
                    ...persistWith
                },
                target: {
                    getPersistableState: () => new PersistableState(zoneGridModel.mappings),
                    setPersistableState: ({value}) => zoneGridModel.setMappings(value)
                },
                owner: this
            });
        }

        if (persistGrouping) {
            const persistWith = isObject(persistGrouping) ? persistGrouping : rootPersistWith;
            PersistenceProvider.create({
                persistOptions: {
                    path: `${path}.groupBy`,
                    ...persistWith
                },
                target: {
                    getPersistableState: () => new PersistableState(zoneGridModel.groupBy),
                    setPersistableState: ({value}) => zoneGridModel.setGroupBy(value)
                },
                owner: this
            });
        }

        if (persistSort) {
            const persistWith = isObject(persistSort) ? persistSort : rootPersistWith;
            PersistenceProvider.create({
                persistOptions: {
                    path: `${path}.sortBy`,
                    ...persistWith
                },
                target: {
                    getPersistableState: () =>
                        new PersistableState(zoneGridModel.sortBy?.toString()),
                    setPersistableState: ({value}) => zoneGridModel.setSortBy(value)
                },
                owner: this
            });
        }
    }
}
