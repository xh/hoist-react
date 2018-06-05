/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {action, observable, computed} from '@xh/hoist/mobx';
import {castArray, intersection, union} from 'lodash';

/**
 * Model for managing store selections.
 */
@HoistModel()
export class StoreSelectionModel {

    store = null;

    @observable.ref ids = [];

    /** Single selected record, or null if multiple or no records selected. */
    @computed
    get singleRecord() {
        const ids = this.ids;
        return ids.length === 1 ? this.store.getById(ids[0]) : null;
    }

    /** Currently selected records. */
    @computed
    get records() {
        return this.ids.map(it => this.store.getById(it));
    }

    /** Is the selection empty? */
    @computed
    get isEmpty() {
        return this.ids.length === 0;
    }

    /** Number of currently selected records. */
    @computed
    get count() {
        return this.ids.length;
    }

    /**
     * @param {BaseStore} store - Store containing the data
     */
    constructor({store}) {
        this.store = store;
        this.addAutorun(() => {
            // Remove recs from selection if they are no longer in store e.g. (due to filtering)
            const storeIds = this.store.records.map(it => it.id),
                selection = this.ids,
                newSelection = intersection(storeIds, selection);

            if (selection.length !== newSelection.length) this.select(newSelection);
        });
    }

    /**
     * Set the selection.
     *
     * @param {Object[]} records - supports either single record, single id, array of records or array of ids
     * @param {boolean} [clearSelection] - clear previous selection (rather than add to it)?
     */
    @action
    select(records, clearSelection = true) {
        const ids = castArray(records).map(it => {
            return it.id != null ? it.id : it;
        }).filter(id => {
            return this.store.getById(id, true);
        });
        this.ids = clearSelection ? ids : union(this.ids, ids);
    }


    /**
     * Clear the selection.
     */
    @action
    clear() {
        this.select([]);
    }

}