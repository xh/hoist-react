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
        const store = this.parent.store,
            sortModel = this.parent.gridApi.getSortModel()[0],
            recs = sortModel ? store.getSorted(sortModel.colId, sortModel.sort, true) : store.records;
        if (recs.length) this.select(recs[0]);
    }

    /**
     * Auto-select first record in grid, unless a record is already selected.
     * Useful for grids that should always have a selection
     */
    autoSelectFirst() {
        if (!this.singleRecord) this.selectFirst();
    }

}