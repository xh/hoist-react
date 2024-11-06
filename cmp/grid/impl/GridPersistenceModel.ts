/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, PersistableState, PersistenceProvider} from '@xh/hoist/core';
import {isObject} from 'lodash';
import {GridModel} from '../GridModel';
import {GridModelPersistOptions} from '../Types';

/**
 * Model to manage persisting state from GridModel.
 * @internal
 */
export class GridPersistenceModel extends HoistModel {
    override xhImpl = true;

    constructor(
        gridModel: GridModel,
        {
            persistColumns = true,
            persistGrouping = true,
            persistSort = true,
            path = 'grid',
            ...rootPersistWith
        }: GridModelPersistOptions
    ) {
        super();

        if (persistColumns) {
            const persistWith = isObject(persistColumns) ? persistColumns : rootPersistWith;
            PersistenceProvider.create({
                persistOptions: {
                    path: `${path}.columns`,
                    ...persistWith
                },
                target: {
                    getPersistableState: () =>
                        new PersistableState(gridModel.persistableColumnState),
                    setPersistableState: ({value}) => gridModel.setColumnState(value)
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
                        new PersistableState(gridModel.sortBy.map(it => it.toString())),
                    setPersistableState: ({value}) => gridModel.setSortBy(value)
                },
                owner: this
            });
        }

        if (persistGrouping) {
            const persistWith = isObject(persistSort) ? persistSort : rootPersistWith;
            PersistenceProvider.create({
                persistOptions: {
                    path: `${path}.groupBy`,
                    ...persistWith
                },
                target: {
                    getPersistableState: () => new PersistableState(gridModel.groupBy),
                    setPersistableState: ({value}) => gridModel.setGroupBy(value)
                },
                owner: this
            });
        }
    }
}
