/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';
import {isNil, flatMap} from 'lodash';
import {ValidationState} from './validation/ValidationState';

/**
 * Wrapper object for each data element within a {@see Store}. Records must be assigned a unique ID
 * within their Store and manage a bundle of data with fields defined by the Store. They track the
 * state of that data through possible updates, with support for tracking edits and "committing"
 * changes to provide dirty state.
 *
 * Each StoreRecord holds a pointer to its parent record, if any, via that parent's ID. (Note this
 * is deliberately not a direct object reference, to allow parent records to be recreated
 * without requiring children to also be recreated.)
 *
 * Records are intended to be created and managed internally by Store implementations and should
 * most not typically be constructed directly within application code.
 */
export class StoreRecord {

    /** @member {StoreRecordId} */
    id;
    /** @member {StoreRecordId} */
    parentId;
    /** @member {Store} */
    store;
    /** @member {boolean} */
    isSummary;
    /** @member {StoreRecordId[]} */
    treePath;

    /** @member {Object} - raw data loaded into via Store.loadData() or Store.updateData(). */
    raw;

    /**
     * @member {Object} - an object containing the current field values for this record.
     *
     * Note that this object will only contain explicit 'own' properties for fields that are
     * not at their default values - default values will be present via the prototype. For an
     * object providing an explicit enumeration of all field values {@see StoreRecord.getValues()}.
     */
    data;

    /**
     * @member {Object} - an object containing the fully committed field values for this record.
     *
     * This object has the same form as `data`. If this record has not been locally modified, this
     * property will point to the same object as `data`.
     */
    committedData;

    /**
     * @member {string} - unique ID for representing record within ag-Grid node API.
     *
     * A string variant of the main record ID.  It should be used when trying to identify or
     * locate the record using the ag-Grid callbacks and API.
     */
    agId;

    get isRecord() {return true}

    /** @returns {boolean} - true if the StoreRecord has never been committed. */
    get isAdd() {
        return this.committedData === null;
    }

    /** @returns {boolean} - true if the StoreRecord has been modified since it was last committed. */
    get isModified() {
        return this.committedData && this.committedData !== this.data;
    }

    /** @returns {boolean} - false if the StoreRecord has been added or modified. */
    get isCommitted() {
        return this.committedData === this.data;
    }

    /** @returns {StoreRecord} */
    get parent() {
        return this.parentId != null ? this.store.getById(this.parentId) : null;
    }

    /** @returns {number} */
    get depth() {
        return this.treePath.length - 1;
    }

    /** @returns {Field[]} */
    get fields() {
        return this.store.fields;
    }

    /**
     * @param {string} fieldName
     * @returns {*} - the current value of a field.
     */
    get(fieldName) {
        return this.data[fieldName];
    }

    /** @returns {StoreRecord[]} - children of this record, respecting any filter (if applied). */
    get children() {
        return this.store.getChildrenById(this.id, true);
    }

    /** @returns {StoreRecord[]} - all children of this record, unfiltered. */
    get allChildren() {
        return this.store.getChildrenById(this.id, false);
    }

    /** @returns {StoreRecord[]} - descendants of this record, respecting any filter (if applied). */
    get descendants() {
        return this.store.getDescendantsById(this.id, true);
    }

    /** @returns {StoreRecord[]} - all descendants of this record, unfiltered. */
    get allDescendants() {
        return this.store.getDescendantsById(this.id, false);
    }

    /** @returns {StoreRecord[]} - ancestors of this record, respecting any filter (if applied). */
    get ancestors() {
        return this.store.getAncestorsById(this.id, true);
    }

    /** @returns {StoreRecord[]} - all ancestors of this record, unfiltered. */
    get allAncestors() {
        return this.store.getAncestorsById(this.id, false);
    }

    /** @return {boolean} - true if the record is confirmed to be Valid. */
    get isValid() {
        return this.validationState === ValidationState.Valid;
    }

    /** @return {boolean} - true if the record is confirmed to be NotValid. */
    get isNotValid() {
        return this.validationState === ValidationState.NotValid;
    }

    /** @return {ValidationState} - the current validation state of the record. */
    get validationState() {
        return this.validator?.validationState ?? ValidationState.Unknown;
    }

    /** @return {Object} - Map of field names to list of errors. */
    get errors() {
        return this.validator?.errors ?? {};
    }

    /** @return {string[]} - Array of all errors for this record. */
    get allErrors() {
        return flatMap(this.errors);
    }

    /** @return {number} - count of all validation errors for the record. */
    get errorCount() {
        return this.validator?.errorCount ?? 0;
    }

    /** @return {boolean} - true if any fields are currently recomputing their validation state. */
    get isValidationPending() {
        return this.validator?.isPending ?? false;
    }

    /** @return {RecordValidator} */
    get validator() {
        return this.store.validator.findRecordValidator(this.id);
    }

    /**
     * @returns {Object} - a new object with enumerated values for all Fields in this StoreRecord.
     *      Unlike 'data', the object returned by this method contains an 'own' property for every
     *      Field in the Store. Useful for cloning/iterating over all values (including defaults).
     */
    getValues() {
        const ret = {id: this.id};
        this.fields.forEach(({name}) => {
            ret[name] = this.data[name];
        });
        return ret;
    }

    /**
     * Construct a StoreRecord from a pre-processed `data` source object.
     *
     * Not typically called by applications directly. `Store` instances create `StoreRecord` instances
     * when loading or updating data through their public APIs. {@see Store.createRecord} for the
     * primary implementation, which includes parsing based on `data/Field` types and definitions.
     *
     * @param {Object} c - StoreRecord configuration
     * @param {StoreRecordId} c.id - Record ID
     * @param {Store} c.store - Store containing this StoreRecord.
     * @param {Object} c.data - data for this StoreRecord, pre-processed if applicable by
     *      `Store.processRawData()` and `Field.parseVal()`. Note: This must be a new object
     *      dedicated to this StoreRecord. This object will be enhanced with an id and frozen.
     * @param {Object} [c.raw] - the original data for the StoreRecord, prior to any Store
     *      pre-processing.  This data is for reference only and will not be altered by this object.
     * @param {Object?} [c.committedData] - the committed version of the data that was loaded
     *      into a StoreRecord in the Store. Pass `null` to indicate that this is a "new" StoreRecord that has
     *      been added since the last load.
     * @param {StoreRecord} [c.parent] - parent record, if any.
     * @param {boolean} [c.isSummary] - whether this StoreRecord is a summary StoreRecord, used to show
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
        throwIf(
            isNil(id),
            "Record needs an ID. Use 'Store.idSpec' to specify a unique ID for each record."
        );
        data.id = id;

        this.id = id;
        this.agId = 'ag_'+ id.toString();
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
        this.store.getChildrenById(this.id, fromFiltered).forEach(fn);
    }

    /**
     * Calls 'fn' for each descendant record of this record.
     * @param {function} fn - the function to call.
     * @param {boolean} [fromFiltered] - true to skip records excluded by any active filter.
     */
    forEachDescendant(fn, fromFiltered = false) {
        this.store.getDescendantsById(this.id, fromFiltered).forEach(fn);
    }

    /**
     * Calls 'fn' for each ancestor record of this record.
     * @param {function} fn - the function to call.
     * @param {boolean} [fromFiltered] - true to skip records excluded by any active filter.
     */
    forEachAncestor(fn, fromFiltered = false) {
        this.store.getAncestorsById(this.id, fromFiltered).forEach(fn);
    }

    // --------------------------
    // Protected methods
    // --------------------------
    /**
     * Finalize this record for use in Store, post acceptance by RecordSet.
     *
     * We finalize the StoreRecord post-construction in RecordSet, only once we know that it is going to
     * be accepted in the new RecordSet (and is not a duplicate).  This is a performance
     * optimization to avoid operations like freezing on transient records.
     *
     * @package - not for application use.
     */
    finalize() {
        if (this.store.freezeData) {
            Object.freeze(this.data);
        }
    }
}

/**
 * @typedef {(number|string)} StoreRecordId - unique identifier for a StoreRecord within a Store.
 */

/**
 * @typedef {(StoreRecord|StoreRecordId)} StoreRecordOrId - a Hoist StoreRecord, or an ID for one.
 */
