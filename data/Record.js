/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {deepFreeze, throwIf} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';

/**
 * Wrapper object for each data element within a {@see Store}. Records must be assigned a unique ID
 * within their Store and manage a bundle of data with fields defined by the Store. They track the
 * state of that data through possible updates, with support for tracking edits and "committing"
 * changes to provide dirty state.
 *
 * Records also store state related to any parent/child hierarchy, if present.
 *
 * Records are intended to be created and managed internally by Store implementations and should
 * most not typically be constructed directly within application code.
 */
export class Record {

    /** @member {(string|number)} */
    id;
    /** @member {(string|number)} */
    parentId;
    /** @member {Object} */
    committedData;
    /** @member {Object} */
    raw;
    /** @member {Object} */
    data;
    /** @member {Store} */
    store;
    /** @member {boolean} */
    isSummary;
    /** @member {string[]|number[]} */
    treePath;

    get isRecord() {return true}

    /** @returns {boolean} - true if the Record has never been committed. */
    get isAdd() {
        return this.committedData === null;
    }

    /** @returns {boolean} - true if the Record has been modified since it was last committed. */
    get isModified() {
        return this.committedData && this.committedData !== this.data;
    }

    /** @returns {boolean} - false if the Record has been added or modified. */
    get isCommitted() {
        return this.committedData === this.data;
    }

    /** @returns {Record} */
    get parent() {
        return this.parentId != null ? this.store.getById(this.parentId) : null;
    }

    /** @returns {Field[]} */
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
     * Fields defined on the given Store and install them as data on the new Record.
     *
     * This process will apply basic conversions if required, based on the specified Field types.
     * Properties of the raw object *not* included in the store's Fields config will be ignored.
     *
     * Also tracks a pointer to its parent record, if any, via that parent's ID. (Note this is
     * deliberately not a direct object reference, to allow parent records to be recreated without
     * requiring children to also be recreated.)
     *
     * @param {Object} c - Record configuration
     * @param {(number|string)} c.id - record ID
     * @param {Store} c.store - store containing this record.
     * @param {Object} c.data - data for this record, pre-processed if applicable by
     *      `store.processRawData()` and `Field.parseVal()`.  Note: This must be a new object
     *      dedicated to this record.  This object will be enhanced with an id and frozen.
     * @param {Object} [c.raw] - the original data for the record, prior to any store
     *      pre-processing.  This data is for reference only and will not be altered by this object.
     * @param {Object?} [c.committedData] - the committed version of the data that was loaded
     *      into a Record in the Store. Pass `null` to indicate that this is a "new" Record that has
     *      been added since the last load.
     * @param {Record} [c.parent] - parent record, if any.
     * @param {boolean} [c.isSummary] - whether this record is a summary record, used to show
     *      aggregate, grand-total level information in grids when enabled.
     */
    constructor({
        id,
        store,
        data,
        raw = null,
        committedData = data,
        parent,
        isSummary = false
    }) {
        throwIf(isNil(id), 'Record has an undefined ID. Use \'Store.idSpec\' to resolve a unique ID for each record.');

        this.id = id;
        this.data.id = id;
        this.store = store;
        this.data = data;
        this.raw = raw;
        this.committedData = committedData;
        this.parentId = parent?.id;
        this.treePath = parent ? [...parent.treePath, id] : [id];
        this.isSummary = isSummary;
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

    // --------------------------
    // Protected methods
    // --------------------------
    /** Freezes this Record and its data. Not for application use. */
    freeze() {
        deepFreeze(this.data);
        Object.freeze(this);
    }
}
