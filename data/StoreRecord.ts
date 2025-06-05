/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {PlainObject} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {isNil, flatMap, isMatch, isEmpty} from 'lodash';
import {Store} from './Store';
import {ValidationState} from './validation/ValidationState';
import {RecordValidator} from './impl/RecordValidator';
import {Field} from './Field';
import equal from 'fast-deep-equal';

/**
 * Wrapper object for each data element within a {@link Store}. Records must be assigned a unique ID
 * within their Store and manage a bundle of data with fields defined by the Store. They track the
 * state of that data through possible updates, with support for tracking edits and "committing"
 * changes to provide dirty state.
 *
 * Each StoreRecord holds a pointer to its parent record, if any, via that parent's ID. (Note this
 * is deliberately not a direct object reference, to allow parent records to be recreated without
 * requiring children to also be recreated.)
 *
 * Records are intended to be created and managed internally by Store implementations and should
 * most not typically be constructed directly within application code.
 */
export class StoreRecord {
    readonly id: StoreRecordId;
    readonly parentId: StoreRecordId;
    readonly store: Store;
    readonly isSummary: boolean;
    readonly treePath: StoreRecordId[];

    /** Raw data loaded into via Store.loadData() or Store.updateData(). */
    readonly raw: PlainObject;

    /**
     * An object containing the current field values for this record.
     *
     * Note that this object will only contain explicit 'own' properties for fields that are
     * not at their default values - default values will be present via the prototype.
     *
     * Call {@link getValues} for an object providing an explicit enumeration of all field values.
     */
    readonly data: PlainObject;

    /**
     * An object containing the fully committed field values for this record.
     *
     * This object has the same form as `data`. If this record has not been locally modified, this
     * property will point to the same object as `data`.
     */
    readonly committedData: PlainObject;

    /**
     * Unique ID for representing record within ag-Grid node API.
     *
     * A string variant of the main record ID.  It should be used when trying to identify or
     * locate the record using the ag-Grid callbacks and API.
     */
    readonly agId: string;

    get isRecord(): boolean {
        return true;
    }

    /** True if the StoreRecord has never been committed. */
    get isAdd(): boolean {
        return this.committedData === null;
    }

    /** True if the StoreRecord has been modified since it was last committed. */
    get isDirty(): boolean {
        return this.committedData && !equal(this.committedData, this.data);
    }

    /** Alias for {@link StoreRecord.isDirty} */
    get isModified(): boolean {
        return this.isDirty;
    }

    /** False if the StoreRecord has been added or modified. */
    get isCommitted(): boolean {
        return this.committedData === this.data;
    }

    get parent(): StoreRecord {
        return this.parentId != null ? this.store.getById(this.parentId) : null;
    }

    get depth(): number {
        return this.treePath.length - 1;
    }

    get fields(): Field[] {
        return this.store.fields;
    }

    /** The current value of a field.*/
    get(fieldName: string): any {
        return this.data[fieldName];
    }

    /** Children of this record, respecting any filter (if applied). */
    get children(): StoreRecord[] {
        return this.store.getChildrenById(this.id, true);
    }

    /** All children of this record, unfiltered. */
    get allChildren(): StoreRecord[] {
        return this.store.getChildrenById(this.id, false);
    }

    /** Descendants of this record, respecting any filter (if applied). */
    get descendants(): StoreRecord[] {
        return this.store.getDescendantsById(this.id, true);
    }

    /** All descendants of this record, unfiltered. */
    get allDescendants(): StoreRecord[] {
        return this.store.getDescendantsById(this.id, false);
    }

    /** Ancestors of this record, respecting any filter (if applied). */
    get ancestors(): StoreRecord[] {
        return this.store.getAncestorsById(this.id, true);
    }

    /** All ancestors of this record, unfiltered. */
    get allAncestors(): StoreRecord[] {
        return this.store.getAncestorsById(this.id, false);
    }

    /** True if the record is confirmed to be Valid. */
    get isValid(): boolean {
        return this.validationState === 'Valid';
    }

    /** True if the record is confirmed to be NotValid. */
    get isNotValid(): boolean {
        return this.validationState === 'NotValid';
    }

    /** The current validation state of the record. */
    get validationState(): ValidationState {
        return this.validator?.validationState ?? 'Unknown';
    }

    get modifiedData(): PlainObject {
        if (!this.isDirty) return {};

        const ret = this.fields.reduce((acc, {name}) => {
            if (isNil(this.committedData) || this.data[name] !== this.committedData[name]) {
                acc[name] = this.data[name];
            }
            return acc;
        }, {});

        return isEmpty(ret)
            ? ret
            : {
                  id: this.id,
                  ...ret
              };
    }

    /** Map of field names to list of errors. */
    get errors(): Record<string, string[]> {
        return this.validator?.errors ?? {};
    }

    /** Array of all errors for this record. */
    get allErrors() {
        return flatMap(this.errors);
    }

    /** Count of all validation errors for the record. */
    get errorCount(): number {
        return this.validator?.errorCount ?? 0;
    }

    /** True if any fields are currently recomputing their validation state. */
    get isValidationPending(): boolean {
        return this.validator?.isPending ?? false;
    }

    get validator(): RecordValidator {
        return this.store.validator.findRecordValidator(this.id);
    }

    /**
     * Get a new object with enumerated values for all Fields in this StoreRecord.
     * Unlike 'data', the object returned by this method contains an 'own' property for every
     * Field in the Store. Useful for cloning/iterating over all values (including defaults).
     */
    getValues(): PlainObject {
        const ret = {id: this.id};
        this.fields.forEach(({name}) => {
            ret[name] = this.data[name];
        });
        return ret;
    }

    /**
     * Construct a StoreRecord from a pre-processed `data` source object.
     *
     * Not typically called by applications directly - `Store` instances create `StoreRecord`s when
     * loading or updating data through their public APIs. See {@link Store.createRecord} for the
     * primary implementation, which includes parsing based on the Store's {@link Field} types
     * and definitions.
     *
     * @internal
     */
    constructor(config: StoreRecordConfig) {
        const {
            id,
            store,
            data,
            raw = null,
            committedData = data,
            parent,
            isSummary = false
        } = config;
        throwIf(
            isNil(id),
            "Record needs an ID. Use 'Store.idSpec' to specify a unique ID for each record."
        );
        data.id = id;

        this.id = id;
        this.agId = 'ag_' + id.toString();
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
     * @param fn - the function to call.
     * @param fromFiltered - true to skip records excluded by any active filter.
     */
    forEachChild(fn: (r: StoreRecord) => void, fromFiltered: boolean = false) {
        this.store.getChildrenById(this.id, fromFiltered).forEach(fn);
    }

    /**
     * Calls 'fn' for each descendant record of this record.
     * @param fn - the function to call.
     * @param fromFiltered - true to skip records excluded by any active filter.
     */
    forEachDescendant(fn: (r: StoreRecord) => void, fromFiltered: boolean = false) {
        this.store.getDescendantsById(this.id, fromFiltered).forEach(fn);
    }

    /**
     * Calls 'fn' for each ancestor record of this record.
     * @param fn - the function to call.
     * @param fromFiltered - true to skip records excluded by any active filter.
     */
    forEachAncestor(fn: (r: StoreRecord) => void, fromFiltered: boolean = false) {
        this.store.getAncestorsById(this.id, fromFiltered).forEach(fn);
    }

    /**
     * Tests to see if this Record's data matches the given partial data object.
     */
    matchesData(partialData: PlainObject): boolean {
        return isMatch(this.data, partialData);
    }

    // --------------------------
    // Protected methods
    // --------------------------
    /**
     * Finalize this record for use in Store, post acceptance by RecordSet.
     *
     * We finalize the StoreRecord post-construction in RecordSet, only once we know that it is
     * going to be accepted in the new RecordSet (and is not a duplicate). This is a performance
     * optimization to avoid operations like freezing on transient records.
     *
     * @internal
     */
    finalize() {
        if (this.store.freezeData) {
            Object.freeze(this.data);
        }
    }
}

/** Unique identifier for a StoreRecord within a Store. */
export type StoreRecordId = number | string;

/** A Hoist StoreRecord, or an ID for one. */
export type StoreRecordOrId = StoreRecordId | StoreRecord;

/** StoreRecord constructor arguments. */
export interface StoreRecordConfig {
    /** Unique ID for the Record. */
    id: StoreRecordId;

    /** Store containing this StoreRecord. */
    store: Store;

    /**
     * Data for this StoreRecord, pre-processed if applicable by `Store.processRawData()` and
     * `Field.parseVal()`. Note this must be a new object dedicated to this StoreRecord.
     * This object will be enhanced with an id and frozen.
     */
    data: PlainObject;

    /**
     * The original data for the StoreRecord, prior to any Store pre-processing.
     * This data is for reference only and will not be altered by this object.
     */
    raw?: PlainObject;

    /**
     * The version of the data that was last loaded via the Store load APIs. Pass `null` to
     * signal that this is a "new" StoreRecord that has been added since the last load.
     */
    committedData?: PlainObject;

    parent?: StoreRecord;

    /**
     * True to indicate this is a summary StoreRecord, used to show aggregate, grand-total level
     * information in grids when enabled.
     */
    isSummary?: boolean;
}
