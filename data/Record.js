/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {isEqual} from 'lodash';

/**
 * Wrapper object for each data element within a {@see BaseStore}.
 *
 * Records are intended to be created and managed internally by Store implementations and should
 * most not typically be constructed directly within application code.
 */
export class Record {

    static RESERVED_FIELD_NAMES = ['parentId', 'store', 'xhTreePath']

    /** @member {(string|number)} */
    id;
    /** @member {BaseStore} */
    store;
    /** @member {String[]} - unique path within hierarchy - for ag-Grid implementation. */
    xhTreePath;

    /** @member {(string|number)} */
    parentId;

    /** @returns {Record} */
    get parent() {
        return this.parentId != null ? this.store.getById(this.parentId) : null;
    }

    /**
     * Construct a Record from a raw source object. Extract values from the source object for all
     * Fields defined on the given Store and install them as top-level properties on the new Record.
     *
     * This process will apply basic conversions if required, based on the specified Field types.
     * Properties of the raw object *not* included in the store's Fields config will be ignored.
     *
     * Also tracks a pointer to its parent record, if any, via that parent's ID. (Note this is
     * deliberately not a direct object reference, to allow parent records to be recreated without
     * requiring children to also be recreated.)
     *
     * @param {Object} c - Record configuration
     * @param {Object} c.raw - raw data for record.
     * @param {BaseStore} c.store - store containing this record.
     * @param {Record} [c.parent] - parent record, if any.
     */
    constructor({raw, store, parent}) {
        const id = raw.id;

        this.id = id;
        this.store = store;
        this.parentId = parent ? parent.id : null;
        this.xhTreePath = parent ? [...parent.xhTreePath, id] : [id];

        store.fields.forEach(f => {
            this[f.name] = f.parseVal(raw[f.name]);
        });
    }

    /**
     * Determine if another record is entirely equivalent to the current record in terms of its
     * enumerated data, containing store, and place within any applicable tree hierarchy.
     * @param {Record} rec - the other record to compare.
     * @returns {boolean}
     */
    isEqual(rec) {
        return (
            this.id == rec.id &&
            this.parentId == rec.parentId &&
            isEqual(this.xhTreePath, rec.xhTreePath) &&
            this.store == rec.store &&
            this.store.fields.every(f => f.isEqual(this[f.name], rec[f.name]))
        );
    }

}

