/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, PersistenceProvider, PlainObject} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isUndefined} from 'lodash';
import {MultiZoneGridModel} from '../MultiZoneGridModel';
import {MultiZoneGridModelPersistOptions} from '../Types';

/**
 * Model to manage persisting state from GridModel.
 * @internal
 */
export class MultiZonePersistenceModel extends HoistModel {
    override xhImpl = true;

    VERSION = 1; // Increment to abandon state.

    multiZoneGridModel: MultiZoneGridModel;

    @observable.ref
    state: PlainObject;

    @managed
    provider: PersistenceProvider;

    constructor(
        multiZoneGridModel: MultiZoneGridModel,
        {
            persistMapping = true,
            persistGrouping = true,
            persistSort = true,
            ...persistWith
        }: MultiZoneGridModelPersistOptions
    ) {
        super();
        makeObservable(this);
        this.multiZoneGridModel = multiZoneGridModel;

        persistWith = {path: 'multiZoneGrid', ...persistWith};

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
            track: () => this.multiZoneGridModel.mappings,
            run: mappings => {
                this.patchState({mappings});
            }
        };
    }

    updateGridMapping() {
        const {mappings} = this.state;
        if (!isUndefined(mappings)) this.multiZoneGridModel.setMappings(mappings);
    }

    //--------------------------
    // Sort
    //--------------------------
    sortReaction() {
        return {
            track: () => this.multiZoneGridModel.sortBy,
            run: sortBy => {
                this.patchState({sortBy: sortBy?.toString()});
            }
        };
    }

    updateGridSort() {
        const {sortBy} = this.state;
        if (!isUndefined(sortBy)) this.multiZoneGridModel.setSortBy(sortBy);
    }

    //--------------------------
    // Grouping
    //--------------------------
    groupReaction() {
        return {
            track: () => this.multiZoneGridModel.groupBy,
            run: groupBy => {
                this.patchState({groupBy});
            }
        };
    }

    updateGridGroupBy() {
        const {groupBy} = this.state;
        if (!isUndefined(groupBy)) this.multiZoneGridModel.setGroupBy(groupBy);
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
