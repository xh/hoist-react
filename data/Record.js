/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {deepFreeze, throwIf} from '@xh/hoist/utils/js';
import equal from 'fast-deep-equal';
import {forEach, isNil, isEqual, reduce} from 'lodash';
import {withDefault} from '../utils/js';

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
    originalRecord;
    /** @member {Object} */
    raw;
    /** @member {Object} */
    data;
    /** @member {Store} */
    store;
    /** @member {boolean} - flag set post-construction by Store on summary recs - for Hoist impl. */
    xhIsSummary;
    /** @member {String[]} - unique path within hierarchy - for ag-Grid impl. */
    xhTreePath;

    /** @returns {boolean} */
    get isNew() {
        return this.originalRecord === null;
    }

    /** @returns {boolean} */
    get isDirty() {
        return this.originalRecord !== this;
    }

    /** @returns {boolean} */
    get isModified() {
        return !this.isNew && this.isDirty;
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
     * @param {Object} c.data - data used to construct this record,
     *      pre-processed if applicable by `store.processRawData()`.
     * @param {Object} c.raw - the same data, prior to any store pre-processing.
     * @param {Store} c.store - store containing this record.
     * @param {string} [c.parentId] - id of parent record, if any.
     */
    constructor({id, data, raw, store, parentId, isSummary, originalRecord}) {
        throwIf(isNil(id), 'Record has an undefined ID. Use \'Store.idSpec\' to resolve a unique ID for each record.');

        this.id = id;
        this.parentId = parentId;
        this.originalRecord = withDefault(originalRecord, this);
        this.raw = raw;
        this.data = data;
        this.store = store;
        this.xhTreePath = this.parent ? [...this.parent.xhTreePath, id] : [id];
        this.xhIsSummary = isSummary;

        forEach(data, (v, key) => {
            Object.defineProperty(this, key, {
                get: () => this.data[key],
                set: () => {
                    throw XH.exception(`Cannot set read-only field '${key}' on immutable Record. Use Store.loadDataTransaction() or Store.updateFields().`);
                }
            });
        });
        deepFreeze(this.data);

        Object.freeze(this);
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
            equal(this.xhTreePath, rec.xhTreePath) &&
            this.store == rec.store &&
            equal(this.data, rec.data)
        );
    }

    /**
     * Determines if a field value has changed since this Record was originally loaded
     * @param {string} name - field name to check.
     * @returns {boolean}
     */
    isFieldDirty(name) {
        if (!this.isDirty) return false;

        const value = this[name], originalValue = this.originalRecord[name];
        return !isEqual(value, originalValue);
    }

    /**
     * Gets an object containing all dirty fields in the Record.
     * @returns {Object.<string, FieldValue>|null}
     */
    getDirtyFields() {
        if (!this.isDirty) return null;

        // For "added" records, return just the current values, since there are no originals
        if (this.isNew) return reduce(this.data, (k, v, ret) => ret[k] = {value: v}, {});

        const ret = {},
            rec = this.originalRecord;

        forEach(this.data, (value, key) => {
            const originalValue = rec[key];
            if (!isEqual(value, originalValue)) ret[key] = {value, originalValue};
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

