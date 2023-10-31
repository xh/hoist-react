/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, PersistenceProvider, PlainObject} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isUndefined} from 'lodash';
import {ZonedGridModel} from '../ZonedGridModel';
import {ZonedGridModelPersistOptions} from '../Types';

/**
 * Model to manage persisting state from ZonedGridModel.
 * @internal
 */
export class ZonedGridPersistenceModel extends HoistModel {
    override xhImpl = true;

    VERSION = 1; // Increment to abandon state.

    zonedGridModel: ZonedGridModel;

    @observable.ref
    state: PlainObject;

    @managed
    provider: PersistenceProvider;

    constructor(
        zonedGridModel: ZonedGridModel,
        {
            persistMapping = true,
            persistGrouping = true,
            persistSort = true,
            ...persistWith
        }: ZonedGridModelPersistOptions
    ) {
        super();
        makeObservable(this);
        this.zonedGridModel = zonedGridModel;

        persistWith = {path: 'zonedGrid', ...persistWith};

        // 1) Read state from and attach to provider -- fail gently
        try {
            this.provider = PersistenceProvider.create(persistWith);
            this.state = this.loadState() ?? {version: this.VERSION};
            this.addReaction({
                track: () => this.state,
                run: state => this.provider.write(state)
            });
        } catch (e) {
            console.error(e);
            this.state = {version: this.VERSION};
        }

        // 2) Bind self to grid, and populate grid.
        if (persistMapping) {
            this.updateGridMapping();
            this.addReaction(this.mappingReaction());
        }

        if (persistGrouping) {
            this.updateGridGroupBy();
            this.addReaction(this.groupReaction());
        }

        if (persistSort) {
            this.updateGridSort();
            this.addReaction(this.sortReaction());
        }
    }

    @action
    clear() {
        this.state = {version: this.VERSION};
    }

    //--------------------------
    // Columns
    //--------------------------
    mappingReaction() {
        return {
            track: () => this.zonedGridModel.mappings,
            run: mappings => {
                this.patchState({mappings});
            }
        };
    }

    updateGridMapping() {
        const {mappings} = this.state;
        if (!isUndefined(mappings)) this.zonedGridModel.setMappings(mappings);
    }

    //--------------------------
    // Sort
    //--------------------------
    sortReaction() {
        return {
            track: () => this.zonedGridModel.sortBy,
            run: sortBy => {
                this.patchState({sortBy: sortBy?.toString()});
            }
        };
    }

    updateGridSort() {
        const {sortBy} = this.state;
        if (!isUndefined(sortBy)) this.zonedGridModel.setSortBy(sortBy);
    }

    //--------------------------
    // Grouping
    //--------------------------
    groupReaction() {
        return {
            track: () => this.zonedGridModel.groupBy,
            run: groupBy => {
                this.patchState({groupBy});
            }
        };
    }

    updateGridGroupBy() {
        const {groupBy} = this.state;
        if (!isUndefined(groupBy)) this.zonedGridModel.setGroupBy(groupBy);
    }

    //--------------------------
    // Other Implementation
    //--------------------------
    @action
    patchState(updates) {
        this.state = {...this.state, ...updates};
    }

    loadState() {
        const ret = this.provider.read();
        return ret?.version === this.VERSION ? ret : null;
    }
}
