/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {autorun, action, observable, computed} from 'hoist/mobx';
import {castArray, intersection, union, orderBy} from 'lodash';

/**
 * Model for managing the selection in a GridPanel.
 */
export class GridSelectionModel {

    parent = null;

    @observable.ref ids = [];

    @computed get singleRecord() {
        const ids = this.ids;
        return ids.length === 1 ? this.parent.store.getById(ids[0]) : null;
    }

    @computed get records() {
        return this.ids.map(it => this.parent.store.getById(it));
    }

    @computed get isEmpty() {
        return this.ids.length === 0;
    }

    @computed get count() {
        return this.ids.length;
    }

    constructor({parent}) {
        this.parent = parent;
        autorun(() => {
            // Remove recs from selection if they are no longer in store e.g. (due to filtering)
            const storeIds = this.parent.store.records.map(it => it.id),
                selection = this.ids,
                newSelection = intersection(storeIds, selection);

            if (selection.length !== newSelection.length) this.select(newSelection);
        });
    }

    /**
     * Set grid selection
     *
     * @param records, supports either single record, single id, array of records or array of ids
     * @param clearSelection, whether to clear previous selection rather than add to it.
     */
    @action
    select(records, clearSelection = true) {
        const ids = castArray(records).map(it => {
            return it.id != null ? it.id : it;
        }).filter(id => {
            return this.parent.store.getById(id, true);
        });
        this.ids = clearSelection ? ids : union(this.ids, ids);
    }

    /**
     * Selects first row in grid
     */
    selectFirst() {
        const {store, sortBy} = this.parent,
            colIds = sortBy.map(it => it.colId),
            sorts = sortBy.map(it => it.sort),
            recs = orderBy(store.records, colIds, sorts);

        if (recs.length) this.select(recs[0]);
    }

}