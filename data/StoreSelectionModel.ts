/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {action, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {castArray, compact, remove, isEqual, union, map} from 'lodash';
import {Store} from './Store';
import {StoreRecord, StoreRecordId, StoreRecordOrId} from './StoreRecord';

export interface StoreSelectionConfig {
    store?: Store;
    mode?: 'single' | 'multiple' | 'disabled';
    xhImpl?: boolean;
}

/**
 * Model for managing store selections.
 * Typically accessed from a GridModel to observe/control Grid selection.
 */
export class StoreSelectionModel extends HoistModel {
    readonly store: Store;
    mode: 'single' | 'multiple' | 'disabled';

    @observable.ref
    private _ids = [];

    get isEnabled(): boolean {
        return this.mode !== 'disabled';
    }

    constructor({store, mode = 'single', xhImpl = false}: StoreSelectionConfig) {
        super();
        makeObservable(this);

        this.xhImpl = xhImpl;
        this.store = store;
        this.mode = mode;
        this.addReaction(this.cullSelectionReaction());
    }

    @computed.struct
    get selectedRecords(): StoreRecord[] {
        return compact(this._ids.map(it => this.store.getById(it, true)));
    }

    @computed.struct
    get selectedIds(): StoreRecordId[] {
        return map(this.selectedRecords, 'id');
    }

    /**
     * Single selected record, or null if multiple/no records selected.
     *
     * Note that this getter will also change if just the data of selected record is changed
     * due to store loading or editing.  Applications only interested in the *identity*
     * of the selection should use {@link selectedId} instead.
     */
    get selectedRecord(): StoreRecord {
        const {selectedRecords} = this;
        return selectedRecords.length === 1 ? selectedRecords[0] : null;
    }

    /**
     * ID of selected record, or null if multiple/no records selected.
     *
     * Note that this getter will *not* change if just the data of selected record is changed
     * due to store loading or editing.  Applications also interested in the *contents* of the
     * selection should use the {@link selectedRecord} getter instead.
     */
    get selectedId(): StoreRecordId {
        const {selectedIds} = this;
        return selectedIds.length === 1 ? selectedIds[0] : null;
    }

    /** @returns true if selection is empty. */
    get isEmpty(): boolean {
        return this.count === 0;
    }

    /** @returns count of currently selected records. */
    @computed
    get count(): number {
        return this.selectedRecords.length;
    }

    /**
     * Set the selection.
     * @param records - single record/ID or array of records/IDs to select.
     * @param clearSelection - true to clear previous selection (rather than add to it).
     */
    @action
    select(records: StoreRecordOrId | StoreRecordOrId[], clearSelection: boolean = true) {
        records = castArray(records ?? []);
        if (this.mode === 'disabled') return;
        if (this.mode === 'single' && records.length > 1) {
            records = [records[0]];
        }
        const ids = records
            .map(it => {
                return it instanceof StoreRecord ? it.id : it;
            })
            .filter(id => {
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
    private cullSelectionReaction() {
        // Remove recs from selection if they are no longer in store. Cleanup array in place without
        // modifying observable -- the 'records' getter provides all observable state.
        const {store} = this;
        return {
            track: () => store.records,
            run: () => remove(this._ids, id => !store.getById(id, true))
        };
    }
}
