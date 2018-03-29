/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {autorun, action, observable, computed} from 'hoist/mobx';
import {castArray, intersection, union} from 'lodash';

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
            return it.id ? it.id : it;
        }).filter(id => {
            return this.parent.store.getById(id, true);
        });
        this.ids = clearSelection ? ids : union(this.ids, ids);
    }

    /**
     * Selects first row in grid, accounting for grid sorting
     */
    selectFirst() {
        const {store, gridApi} = this.parent,
            sorters = gridApi.getSortModel().map(it => { return {property: it.colId, direction: it.sort}; }),
            recs = sorters.length ? store.getSorted(sorters, true) : store.records;
        if (recs.length) this.select(recs[0]);
    }

    /**
     * Select first record in grid if none are already selected.
     * Useful for grids that should always have a selection
     */
    ensureRecordSelected() {
        if (this.isEmpty) this.selectFirst();
    }

}