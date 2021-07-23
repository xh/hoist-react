/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {action, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {castArray, compact, remove, isEqual, union, map} from 'lodash';

/**
 * Model for managing store selections.
 * Typically accessed from a GridModel to observe/control Grid selection.
 */
export class StoreSelectionModel extends HoistModel {

    /** @member {Store} */
    store;
    /** @member {string} */
    mode;

    @observable.ref _ids = [];

    /**
     * @param {Object} c - StoreSelectionModel configuration.
     * @param {Store} c.store - Store containing the data.
     * @param {string} [c.mode] - one of ['single', 'multiple', 'disabled'].
     */
    constructor({store, mode = 'single'}) {
        super();
        makeObservable(this);
        this.store = store;
        this.mode = mode;
        this.addReaction(this.cullSelectionReaction());
    }

    /** @return {Record[]} - currently selected records. */
    @computed.struct
    get records() {
        return compact(this._ids.map(it => this.store.getById(it, true)));
    }

    /** @return {RecordId[]} - IDs of currently selected records. */
    @computed.struct
    get ids() {
        return map(this.records, 'id');
    }

    /**
     * @return {?Record} - single selected record, or null if multiple/no records selected.
     *
     * Note that this getter will also change if just the data of selected record is changed
     * due to store loading or editing.  Applications only interested in the identity
     * of the selection should use {@see selectedRecordId} instead.
     */
    get singleRecord() {
        const {records} = this;
        return records.length === 1 ? records[0] : null;
    }

    /**
     * @return {?RecordId} - ID of selected record, or null if multiple/no records selected.
     *
     * Note that this getter will *not* change if just the data of selected record is changed
     * due to store loading or editing.  Applications also interested in the contents of the
     * of the selection should use the {@see singleRecord} getter instead.
     */
    get selectedRecordId() {
        const {ids} = this;
        return ids.length === 1 ? ids[0] : null;
    }

    /** @return {boolean} - true if selection is empty. */
    get isEmpty() {
        return this.count === 0;
    }

    /** @return {number} - count of currently selected records. */
    @computed
    get count() {
        return this.records.length;
    }

    /**
     * Set the selection.
     * @param {(RecordOrId|RecordOrId[])} records - single record/ID or array of records/IDs to select.
     * @param {boolean} [clearSelection] - true to clear previous selection (rather than add to it).
     */
    @action
    select(records, clearSelection = true) {
        records = castArray(records ?? []);
        if (this.mode === 'disabled') return;
        if (this.mode === 'single' && records.length > 1) {
            records = [records[0]];
        }
        const ids = records.map(it => {
            return it.id != null ? it.id : it;
        }).filter(id => {
            return this.store.getById(id, true);
        });

        if (isEqual(ids, this._ids)) {
            return;
        }

        this._ids = clearSelection ? ids : union(this._ids, ids);
    }

    /** Select all filtered records. */
    @action
    selectAll() {
        if (this.mode === 'multiple') {
            this.select(this.store.records);
        }
    }


    /** Clear the selection. */
    @action
    clear() {
        this.select([]);
    }

    //------------------------
    // Implementation
    //------------------------
    cullSelectionReaction() {
        // Remove recs from selection if they are no longer in store. Cleanup array in place without
        // modifying observable -- the 'records' getter provides all observable state.
        const {store} = this;
        return {
            track: () => store.records,
            run: () => remove(this._ids, id => !store.getById(id, true))
        };
    }
}

