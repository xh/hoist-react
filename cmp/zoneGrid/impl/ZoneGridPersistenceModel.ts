/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, Persistable, PersistenceProvider} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isUndefined} from 'lodash';
import {ZoneGridModel} from '../ZoneGridModel';
import {ZoneGridModelPersistOptions, ZoneGridState} from '../Types';

/**
 * Model to manage persisting state from ZoneGridModel.
 * @internal
 */
export class ZoneGridPersistenceModel extends HoistModel implements Persistable<ZoneGridState> {
    override xhImpl = true;

    VERSION = 1; // Increment to abandon state.

    zoneGridModel: ZoneGridModel;

    @observable.ref
    state: ZoneGridState = {version: this.VERSION};

    @managed
    provider: PersistenceProvider<ZoneGridState>;

    private readonly persistMapping: boolean;
    private readonly persistGrouping: boolean;
    private readonly persistSort: boolean;

    constructor(
        zoneGridModel: ZoneGridModel,
        {
            persistMapping = true,
            persistGrouping = true,
            persistSort = true,
            ...persistWith
        }: ZoneGridModelPersistOptions
    ) {
        super();
        makeObservable(this);

        this.zoneGridModel = zoneGridModel;
        this.persistMapping = persistMapping;
        this.persistGrouping = persistGrouping;
        this.persistSort = persistSort;

        this.addReaction(this.mappingReaction(), this.groupReaction(), this.sortReaction());

        try {
            this.provider = PersistenceProvider.create({
                path: 'zoneGrid',
                ...persistWith,
                bind: this
            });
        } catch (e) {
            this.logError(e);
            this.provider = null;
        }
    }

    //--------------------------
    // Persistable Interface
    //--------------------------
    getPersistableState(): ZoneGridState {
        return this.state;
    }

    setPersistableState(state: ZoneGridState): void {
        if (state.version !== this.VERSION) return;

        if (this.persistMapping) {
            const {mappings} = state;
            if (!isUndefined(mappings)) this.zoneGridModel.setMappings(mappings);
        }

        if (this.persistGrouping) {
            const {groupBy} = state;
            if (!isUndefined(groupBy)) this.zoneGridModel.setGroupBy(groupBy);
        }

        if (this.persistSort) {
            const {sortBy} = state;
            if (!isUndefined(sortBy)) this.zoneGridModel.setSortBy(sortBy);
        }
    }

    //--------------------------
    // Reactions
    //--------------------------
    mappingReaction() {
        if (!this.persistMapping) return;
        return {
            track: () => this.zoneGridModel.mappings,
            run: mappings => {
                this.patchState({mappings});
            }
        };
    }

    sortReaction() {
        if (!this.persistSort) return;
        return {
            track: () => this.zoneGridModel.sortBy,
            run: sortBy => {
                this.patchState({sortBy: sortBy?.toString()});
            }
        };
    }

    groupReaction() {
        if (!this.persistGrouping) return;
        return {
            track: () => this.zoneGridModel.groupBy,
            run: groupBy => {
                this.patchState({groupBy});
            }
        };
    }

    //--------------------------
    // Other Implementation
    //--------------------------
    @action
    patchState(updates) {
        this.state = {...this.state, ...updates};
    }
}
