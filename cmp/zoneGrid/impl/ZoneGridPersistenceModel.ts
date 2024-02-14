/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {GridSorterLike} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, PersistenceProvider, Some} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isUndefined} from 'lodash';
import {ZoneGridModel} from '../ZoneGridModel';
import {Zone, ZoneGridModelPersistOptions, ZoneMapping} from '../Types';

/**
 * Model to manage persisting state from ZoneGridModel.
 * @internal
 */
export class ZoneGridPersistenceModel extends HoistModel {
    override xhImpl = true;

    VERSION = 1; // Increment to abandon state.

    zoneGridModel: ZoneGridModel;

    @observable.ref
    state: {
        sortBy?: GridSorterLike;
        groupBy?: Some<string>;
        version?: number;
        mappings?: Record<Zone, Some<string | ZoneMapping>>;
    };

    @managed
    provider: PersistenceProvider;

    constructor(zoneGridModel: ZoneGridModel, config: ZoneGridModelPersistOptions) {
        super();
        makeObservable(this);

        this.zoneGridModel = zoneGridModel;

        let {
            persistMapping = true,
            persistGrouping = true,
            persistSort = true,
            ...persistWith
        } = config;

        persistWith = {path: 'zoneGrid', ...persistWith};

        // 1) Read state from and attach to provider -- fail gently
        try {
            this.provider = PersistenceProvider.create(persistWith);
            this.state = this.loadState() ?? {version: this.VERSION};
            this.addReaction({
                track: () => this.state,
                run: state => this.provider.write(state)
            });
        } catch (e) {
            this.logError(e);
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
            track: () => this.zoneGridModel.mappings,
            run: mappings => {
                this.patchState({mappings});
            }
        };
    }

    updateGridMapping() {
        const {mappings} = this.state;
        if (!isUndefined(mappings)) this.zoneGridModel.setMappings(mappings);
    }

    //--------------------------
    // Sort
    //--------------------------
    sortReaction() {
        return {
            track: () => this.zoneGridModel.sortBy,
            run: sortBy => {
                this.patchState({sortBy: sortBy?.toString()});
            }
        };
    }

    updateGridSort() {
        const {sortBy} = this.state;
        if (!isUndefined(sortBy)) this.zoneGridModel.setSortBy(sortBy);
    }

    //--------------------------
    // Grouping
    //--------------------------
    groupReaction() {
        return {
            track: () => this.zoneGridModel.groupBy,
            run: groupBy => {
                this.patchState({groupBy});
            }
        };
    }

    updateGridGroupBy() {
        const {groupBy} = this.state;
        if (!isUndefined(groupBy)) this.zoneGridModel.setGroupBy(groupBy);
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
