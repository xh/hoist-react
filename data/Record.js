/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {deepFreeze, throwIf} from '@xh/hoist/utils/js';
import equal from 'fast-deep-equal';
import {forEach, isNil, reduce} from 'lodash';

/**
 * Wrapper object for each data element within a {@see Store}.
 *
 * Records are intended to be created and managed internally by Store implementations and should
 * most not typically be constructed directly within application code.
 */
export class Record {

    /** @member {(string|number)} */
    id;
    /** @member {(string|number)} */
    parentId;
    /** @member {Record} */
    committedRecord;
    /** @member {Object} */
    raw;
    /** @member {Object} */
    data;
    /** @member {Store} */
    store;
    /** @member {boolean} - flag set post-construction by Store on summary recs - for Hoist impl. */
    xhIsSummary;

    /** @returns {boolean} - true if the Record has not been committed. */
    get isNew() {
        return this.committedRecord === null;
    }

    /** @returns {boolean} - true if the Record has been modified since it was last committed. */
    get isModified() {
        return this.committedRecord && this.committedRecord !== this;
    }

    /** @returns {boolean} - false if the Record has been added or modified. */
    get isCommitted() {
        return this.committedRecord === this;
    }

    /** @returns {Record} */
    get parent() {
        return this.parentId != null ? this.store.getById(this.parentId) : null;
    }

    /** @member {Field[]} */
    get fields() {
        return this.store.fields;
    }

    /**
     * The children of this record, respecting any filter (if applied).
     * @returns {Record[]}
     */
    get children() {
        return this.store.getChildrenById(this.id, true);
    }

    /**
     * All children of this record unfiltered.
     * @returns {Record[]}
     */
    get allChildren() {
        return this.store.getChildrenById(this.id, false);
    }

    /**
     * The descendants of this record, respecting any filter (if applied).
     * @returns {Record[]}
     */
    get descendants() {
        return this.store.getDescendantsById(this.id, true);
    }

    /**
     * All descendants of this record unfiltered.
     * @returns {Record[]}
     */
    get allDescendants() {
        return this.store.getDescendantsById(this.id, false);
    }

    /**
     * The ancestors of this record, respecting any filter (if applied).
     * @returns {Record[]}
     */
    get ancestors() {
        return this.store.getAncestorsById(this.id, true);
    }

    /**
     * All ancestors of this record unfiltered.
     * @returns {Record[]}
     */
    get allAncestors() {
        return this.store.getAncestorsById(this.id, false);
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
     * @param {number|string} c.id - record id
     * @param {Object} c.data - data used to construct this record,
     *      pre-processed if applicable by `store.processRawData()` and `Field.parseVal()`.
     * @param {Store} c.store - store containing this record.
     * @param {Object} [c.raw] - the same data, prior to any store pre-processing.
     * @param {Record} [c.parent] - parent record, if any.
     * @param {boolean} [c.isSummary] - whether this record is a summary record.
     * @param {Record|null} [c.committedRecord] - the clean Record loaded into the Store. Defaults to
     *      `this` to indicate that this Record is the original. Pass `null` to indicate that this is
     *      a "new" Record with no backing original data in the Store data source.
     */
    constructor({id, data, raw = null, store, parent, isSummary = false, committedRecord = this}) {
        throwIf(isNil(id), 'Record has an undefined ID. Use \'Store.idSpec\' to resolve a unique ID for each record.');

        this.id = id;
        this.parentId = parent?.id;
        this.committedRecord = committedRecord;
        this.raw = raw;
        this.data = data;
        this.store = store;
        this.xhIsSummary = isSummary;
        this.xhTreePath = parent ? [...parent.xhTreePath, id] : [id];
    }

    freeze() {
        deepFreeze(this.data);
        Object.freeze(this);
    }

    /**
     * Determines if a field value has changed since this Record was originally loaded
     * @param {string} name - field name to check.
     * @returns {boolean}
     */
    isFieldDirty(name) {
        if (!this.isModified) return false;

        const value = this[name], originalValue = this.committedRecord[name];
        return !equal(value, originalValue);
    }

    /**
     * Gets an object containing all dirty fields in the Record.
     * @returns {Object.<string, FieldValue>|null}
     */
    getDirtyFields() {
        if (!this.isModified) return null;

        // For "added" records, return just the current values, since there are no originals
        if (this.isNew) return reduce(this.data, (k, v, ret) => ret[k] = {value: v}, {});

        const ret = {},
            rec = this.committedRecord;

        forEach(this.data, (value, key) => {
            const originalValue = rec[key];
            if (!equal(value, originalValue)) ret[key] = {value, originalValue};
        });

        return ret;
    }

    /**
     * Calls 'fn' for each child record of this record.
     * @param {function} fn - the function to call.
     * @param {boolean} [fromFiltered] - true to skip records excluded by any active filter.
     */
    forEachChild(fn, fromFiltered = false) {
        this.store.getChildrenById(this.id, fromFiltered).forEach(it => it.fn);
    }

    /**
     * Calls 'fn' for each descendant record of this record.
     * @param {function} fn - the function to call.
     * @param {boolean} [fromFiltered] - true to skip records excluded by any active filter.
     */
    forEachDescendant(fn, fromFiltered = false) {
        this.store.getDescendantsById(this.id, fromFiltered).forEach(it => fn(it));
    }

    /**
     * Calls 'fn' for each ancestor record of this record.
     * @param {function} fn - the function to call.
     * @param {boolean} [fromFiltered] - true to skip records excluded by any active filter.
     */
    forEachAncestor(fn, fromFiltered = false) {
        this.store.getAncestorsById(this.id, fromFiltered).forEach(it => fn(it));
    }
}

/** @typedef FieldValue
 *  @property {*} value - current value of the field
 *  @property {*} [originalValue] - original value of the field, if there is one.
 */

