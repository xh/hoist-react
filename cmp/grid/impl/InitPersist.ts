/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    DashViewProvider,
    PersistableState,
    PersistenceProvider,
    persistOptions,
    PersistOptions,
    ViewManagerProvider
} from '@xh/hoist/core';
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
        hideNewColumns,
        path = 'grid',
        ...rootPersistWith
    }: GridModelPersistOptions
) {
    if (persistColumns) {
        const colPersistOptions = persistOptions(
            {path: `${path}.columns`},
            rootPersistWith,
            isObject(persistColumns) ? persistColumns : null
        );

        PersistenceProvider.create({
            persistOptions: colPersistOptions,
            target: {
                getPersistableState: () =>
                    new PersistableColumnState(gridModel.persistableColumnState),
                setPersistableState: ({value}) =>
                    runInAction(() => {
                        gridModel.setColumnState(value, {
                            // Resolved on each read, as the answer can change with the current
                            // ViewManager view.
                            hideNewColumns:
                                hideNewColumns ?? persistsToCuratedView(colPersistOptions)
                        });
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

/**
 * Is the state described by these options persisted as part of a user-curated, named view - i.e.
 * a ViewManager view or a dashboard widget? Users compose these views deliberately, in contrast to
 * providers such as prefs or localStorage, where persisted state is an implicit record of a user's
 * last-used layout.
 *
 * Note the special "default" view of a ViewManager is *not* considered curated - it represents the
 * in-code state active when no saved view is selected.
 */
function persistsToCuratedView(opts: PersistOptions): boolean {
    const providerClass = PersistenceProvider.parseProviderClass(opts);
    if (isSubclassOf(providerClass, DashViewProvider)) return true;
    if (isSubclassOf(providerClass, ViewManagerProvider)) {
        // Note view can be null if still initializing - treat as curated, the safer assumption.
        return !opts.viewManagerModel.view?.isDefault;
    }
    return false;
}

function isSubclassOf(cls: any, base: any): boolean {
    return cls === base || cls.prototype instanceof base;
}

class PersistableColumnState extends PersistableState<ColumnState[]> {
    override equals(other: PersistableState<ColumnState[]>): boolean {
        return isEqual(
            this.value.filter(it => !it.hidden),
            other.value.filter(it => !it.hidden)
        );
    }
}
