/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {HoistBase, managed, PlainObject, Some, XH} from '@xh/hoist/core';
import {
    StoreValidationMessagesMap,
    StoreValidationsMap,
    Validation
} from '@xh/hoist/data/validation/Types';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {logWithDebug, throwIf, warnIf} from '@xh/hoist/utils/js';
import equal from 'fast-deep-equal';
import {
    castArray,
    defaultsDeep,
    differenceBy,
    flatMapDeep,
    isArray,
    isEmpty,
    isFunction,
    isNil,
    isNull,
    isString,
    values,
    remove as lodashRemove,
    uniq,
    first,
    some,
    partition
} from 'lodash';
import {Field, FieldSpec} from './Field';
import {parseFilter} from './filter/Utils';
import {RecordSet} from './impl/RecordSet';
import {StoreValidator} from './impl/StoreValidator';
import {StoreRecord, StoreRecordId, StoreRecordOrId} from './StoreRecord';
import {instanceManager} from '../core/impl/InstanceManager';
import {Filter} from './filter/Filter';
import {FilterLike} from './filter/Types';

export interface StoreConfig {
    /** Field names, configs, or instances. */
    fields?: Array<string | FieldSpec | Field>;

    /**
     * Default configs applied to `Field` instances constructed internally by this Store.
     * @see FieldSpec
     */
    fieldDefaults?: Omit<FieldSpec, 'name'>;

    /**
     * Specification for producing an immutable unique id for each record. May be provided as
     * either a string property name (default is 'id') or a function that receives the raw data
     * and returns a string. This property will be normalized to a function upon Store construction.
     * If there is no natural id to select/generate, you can use `XH.genId` to generate a unique id
     * on the fly. NOTE that in this case, grids and other components bound to this store will not
     * be able to maintain record state across reloads.
     */
    idSpec?: StoreRecordIdSpec;

    /**
     * Initial data to load in to the Store.
     */
    data?: PlainObject[];

    /**
     * Function to run on each individual data object presented to `loadData()` prior to creating
     * a `StoreRecord` from that object. This function must return an object, cloning the original
     * object if edits are necessary.
     */
    processRawData?: (data: PlainObject) => PlainObject;

    /**
     * One or more filters or configs to create one. If an array, a single 'AND' filter
     * will be created.
     */
    filter?: FilterLike;

    /** True if all children of a passing record should also be considered passing (default false).*/
    filterIncludesChildren?: boolean;

    /** True (default) to load hierarchical/tree data, if any. */
    loadTreeData?: boolean;

    /**
     * The property on each raw data object that holds its (raw) child objects, if any.
     * Default 'children', no effect if `loadTreeData: false`.
     */
    loadTreeDataFrom?: string;

    /** True to treat the root node in hierarchical data as the summary record (default false). */
    loadRootAsSummary?: boolean;

    /**
     * True to freeze the internal data object of the record. May be set to false to maximize
     * performance.  Note that the internal data of the record should in all cases be considered
     * immutable (default true).
     */
    freezeData?: boolean;

    /**
     * Set to true to indicate that the id for a record implies a fixed position of the record
     * within the tree hierarchy.  May be set to true to maximize performance (default false).
     */
    idEncodesTreePath?: boolean;

    /**
     * Set to true to indicate that records can be cached and reused based on id and the
     * raw data object they refer to.  This is a useful optimization for large datasets with
     * immutable raw data, allowing them to avoid equality checks, object creation, and raw
     * data processing when reloading reference-identical data. Should not be used if a
     * processRawData function that depends on external state is provided, as this function
     * will be circumvented on subsequent reloads.  Default false.
     */
    reuseRecords?: boolean;

    /**
     * Set to true to always validate all uncommitted records on every change to
     * uncommitted records (add, modify, or remove). Default false.
     */
    validationIsComplex?: boolean;

    /**
     *  Flags for experimental features. These features are designed for early client-access and
     *  testing, but are not yet part of the Hoist API.
     */
    experimental?: PlainObject;
}

/**
 * Object representing data changes to perform on a Store's committed record set in a single
 * transaction.
 */
export interface StoreTransaction {
    /**
     * List of raw data objects representing records to be updated.
     * Updates must be matched to existing records by id in order to be applied. The form of the
     * update objects should be the same as presented to loadData(), with the exception that any
     * children property will be ignored, and any existing children for the record being updated
     * will be preserved. If the record is a child, the new updated instance will be assigned to
     * the same parent. (Meaning: parent/child relationships *cannot* be modified via updates.)
     */
    update?: PlainObject[];

    /** Raw data of new records to be added, */
    add?: Array<PlainObject | ChildRawData>;

    /** IDs of existing records to be removed. Any descendents will also be removed. */
    remove?: StoreRecordId[];

    /**
     *  Update to the dedicated summary record(s) for this store.  If the store has its
     *  `loadRootAsSummary` flag set to true, the summary record should instead be provided via the
     *  `update` property.
     */
    rawSummaryData?: Some<PlainObject>;
}

/**
 * Collection of changes made to a Store's RecordSet. Unlike `StoreTransaction` which is used to
 * specify changes, this object is used to report the actual changes made in a single transaction.
 */
export interface StoreChangeLog {
    update?: StoreRecord[];
    add?: StoreRecord[];
    remove?: StoreRecordId[];
    summaryRecords?: StoreRecord[];
}

export interface ChildRawData {
    /** ID of the pre-existing parent record. */
    parentId: string;

    /**
     * Data for the child records to be added. Can include a `children` property to be processed
     * into new (grand)child records.
     */
    rawData: PlainObject[];
}

export type StoreRecordIdSpec = string | ((data: PlainObject) => StoreRecordId);

/**
 * A managed and observable set of local, in-memory Records.
 */
export class Store extends HoistBase {
    get isStore() {
        return true;
    }

    fields: Field[] = null;
    idSpec: (data: PlainObject) => StoreRecordId;
    processRawData: (raw: any) => any;

    @observable
    filterIncludesChildren: boolean;

    loadTreeData: boolean;
    loadTreeDataFrom: string;
    loadRootAsSummary: boolean;
    idEncodesTreePath: boolean;
    freezeData: boolean;
    reuseRecords: boolean;
    validationIsComplex: boolean;

    @observable.ref
    filter: Filter;

    /** Timestamp (ms) of the last time this store's data was changed. */
    @observable
    lastUpdated: number;

    /** Timestamp (ms) of the last time this store's data was loaded.*/
    @observable
    lastLoaded: number = null;

    /**
     * Records containing summary data, such as top-level aggregations produced by a Hoist Cube
     * or any other custom aggregation(s) calculated and installed by the application. Set via
     * {@link loadData} or by loading a tree structure with `loadRootAsSummary` set to true.
     */
    @observable.ref
    summaryRecords: StoreRecord[] = null;

    /** @internal - used internally by any StoreFilterField bound to this store. */
    @observable
    xhFilterText: string = null;

    @managed
    validator: StoreValidator;

    //----------------------
    // Implementation State
    //----------------------
    @observable.ref
    private _committed: RecordSet;
    @observable.ref
    private _current: RecordSet;
    @observable.ref
    _filtered: RecordSet;

    private _dataDefaults = null;
    _created = Date.now();
    private _fieldMap: Map<string, Field>;
    experimental: any;

    constructor({
        fields,
        fieldDefaults = {},
        idSpec = 'id',
        processRawData = null,
        filter = null,
        filterIncludesChildren = false,
        loadTreeData = true,
        loadTreeDataFrom = 'children',
        loadRootAsSummary = false,
        freezeData = true,
        idEncodesTreePath = false,
        reuseRecords = false,
        validationIsComplex = false,
        experimental,
        data
    }: StoreConfig) {
        super();
        makeObservable(this);
        this.experimental = this.parseExperimental(experimental);
        this.fields = this.parseFields(fields, fieldDefaults);
        this.idSpec = this.parseIdSpec(idSpec);
        this.processRawData = processRawData;
        this.filter = parseFilter(filter);
        this.filterIncludesChildren = filterIncludesChildren;
        this.loadTreeData = loadTreeData;
        this.loadTreeDataFrom = loadTreeDataFrom;
        this.loadRootAsSummary = loadRootAsSummary;
        this.freezeData = freezeData;
        this.idEncodesTreePath = idEncodesTreePath;
        this.reuseRecords = reuseRecords;
        this.validationIsComplex = validationIsComplex;
        this.lastUpdated = Date.now();

        this.resetRecords();

        this.validator = new StoreValidator({store: this});
        this._dataDefaults = this.createDataDefaults();
        this._fieldMap = this.createFieldMap();
        if (data) this.loadData(data);

        instanceManager.registerStore(this);
    }

    /** Remove all records from the store. Equivalent to calling `loadData([])`. */
    @action
    clear() {
        this.loadData([]);
    }

    /**
     * Load a new and complete dataset, replacing any/all pre-existing Records as needed.
     *
     * If raw data objects have a `children` property, it will be expected to be an array and its
     * items will be recursively processed into child Records, each created with a pointer to its
     * parent's newly assigned StoreRecord ID.
     *
     * Note that this process will re-use pre-existing StoreRecord object instances if they are present
     * in the new dataset (as identified by their ID), contain the same data, and occupy the same
     * place in any hierarchy across old and new loads. This is to maximize the ability of
     * downstream consumers (e.g. ag-Grid) to recognize Records that have not changed and do not
     * need to be re-evaluated / re-rendered.
     *
     * Summary data can be provided via `rawSummaryData` or as the root data if the Store was
     * created with its `loadRootAsSummary` flag set to true.
     *
     * @param rawData - source data to load
     * @param rawSummaryData - source data for optional summary record(s), representing
     *      custom aggregations for the dataset, if desired.
     */
    @action
    @logWithDebug
    loadData(rawData: PlainObject[], rawSummaryData?: Some<PlainObject>) {
        // Extract rootSummary if loading non-empty data[] (i.e. not clearing) and loadRootAsSummary
        if (rawData.length !== 0 && this.loadRootAsSummary) {
            throwIf(
                rawData.length !== 1 || !isEmpty(rawSummaryData),
                'Incorrect call to loadData with loadRootAsSummary=true. Summary data should be in a single root node with top-level row data as its children.'
            );
            rawSummaryData = rawData[0];
            rawData = rawData[0].children ?? [];
        }

        this.summaryRecords = rawSummaryData
            ? castArray(rawSummaryData).map(it => this.createRecord(it, null, true))
            : null;

        const records = this.createRecords(rawData, null);
        this._committed = this._current = this._committed.withNewRecords(records);
        this.rebuildFiltered();

        this.lastLoaded = this.lastUpdated = Date.now();
    }

    /**
     * Add, update, or delete Records in this Store. Note that objects passed to this method
     * for adds and updates should have all the raw source data required to create those Records -
     * i.e. they should be in the same form as when passed to `loadData()`. The added/updated
     * source data will be run through this Store's `idSpec` and `processRawData` functions.
     *
     * Adds can also be provided as a {@link ChildRawData} object of the form `{rawData, parentId}`
     * to add new Records under a known, pre-existing parent StoreRecord.
     *
     * Unlike `loadData()`, existing Records that are *not* included in this update transaction
     * will be left in place and as is.
     *
     * Records loaded or removed via this method will be considered to be "committed", with the
     * expectation that inputs to this method were provided by the server or other data source of
     * record. For modifying particular fields on existing Records, see `modifyRecords()`. For local
     * adds/removes not sourced from the server, see `addRecords()` and `removeRecords()`. Those
     * APIs will modify the current RecordSet but leave those changes in an uncommitted state.
     *
     * @param rawData - data changes to process. If provided as an array, rawData will be processed
     *      into adds and updates, with updates determined by matching existing records by ID.
     * @returns changes applied, or null if no record changes were made.
     */
    @action
    @logWithDebug
    updateData(rawData: PlainObject[] | StoreTransaction): StoreChangeLog {
        if (isEmpty(rawData)) return null;

        const changeLog: StoreChangeLog = {};

        // Build a transaction object out of a flat list of adds and updates
        let rawTransaction: StoreTransaction;
        if (isArray(rawData)) {
            const update = [],
                add = [];
            rawData.forEach(it => {
                const isChildData = isChildRawDataObject(it),
                    recId = isChildData
                        ? // The idSpec function does not support the {rawData,parentId} format
                          this.idSpec(it.rawData)
                        : this.idSpec(it);
                if (this.getById(recId)) {
                    // The update array does not support the {rawData,parentId} format
                    update.push(isChildData ? it.rawData : it);
                } else {
                    add.push(it);
                }
            });

            rawTransaction = {update, add};
        } else {
            rawTransaction = rawData;
        }

        const {update, add, remove, rawSummaryData, ...other} = rawTransaction;
        throwIf(!isEmpty(other), 'Unknown argument(s) passed to updateData().');

        // 1) Pre-process updates and adds into Records
        let updateRecs: StoreRecord[], addRecs: Map<StoreRecordId, StoreRecord>;
        if (update) {
            updateRecs = update.map(it => {
                const recId = this.idSpec(it),
                    rec = this.getOrThrow(
                        recId,
                        'In order to update grid data, records must have stable ids. Note: XH.genId() will not provide such ids.'
                    ),
                    parent = rec.parent,
                    isSummary = some(this.summaryRecords, {id: recId});
                return this.createRecord(it, parent, isSummary);
            });
        }
        if (add) {
            addRecs = new Map();
            add.forEach(it => {
                if (isChildRawDataObject(it)) {
                    const {rawData, parentId} = it,
                        parent = !isNil(parentId) ? this.getOrThrow(parentId) : null;
                    this.createRecords([rawData], parent, addRecs);
                } else {
                    this.createRecords([it], null, addRecs);
                }
            });
        }

        // 2) Pre-process summary records, peeling them out of updates if needed
        const {summaryRecords} = this;
        let summaryUpdateRecs: StoreRecord[];
        if (!isEmpty(summaryRecords)) {
            summaryUpdateRecs = lodashRemove(updateRecs, ({id}) => some(summaryRecords, {id}));
        }

        if (isEmpty(summaryUpdateRecs) && rawSummaryData) {
            summaryUpdateRecs = castArray(rawSummaryData).map(it =>
                this.createRecord(it, null, true)
            );
        }

        if (!isEmpty(summaryUpdateRecs)) {
            this.summaryRecords = summaryUpdateRecs;
            changeLog.summaryRecords = this.summaryRecords;
        }

        // 3) Apply changes
        let rsTransaction: {
            update?: StoreRecord[];
            add?: StoreRecord[];
            remove?: StoreRecordId[];
        } = {};
        if (!isEmpty(updateRecs)) rsTransaction.update = updateRecs;
        if (!isEmpty(addRecs)) rsTransaction.add = Array.from(addRecs.values());
        if (!isEmpty(remove)) rsTransaction.remove = remove;

        if (!isEmpty(rsTransaction)) {
            // Apply updates to the committed RecordSet - these changes are considered to be
            // sourced from the server / source of record and are coming in as committed.
            this._committed = this._committed.withTransaction(rsTransaction);

            if (this.isDirty) {
                // If this store had pre-existing local modifications, apply the updates over that
                // local state. This might (or might not) effectively overwrite those local changes,
                // so we normalize against the newly updated committed state to verify if any local
                // modifications remain.
                this._current = this._current
                    .withTransaction(rsTransaction)
                    .normalize(this._committed);
            } else {
                // Otherwise, the updated RecordSet is both current and committed.
                this._current = this._committed;
            }

            this.rebuildFiltered();
            Object.assign(changeLog, rsTransaction);
        }

        if (!isEmpty(changeLog)) {
            this.lastUpdated = Date.now();
        }

        return !isEmpty(changeLog) ? changeLog : null;
    }

    /**
     * Re-runs the Filter on the current data. Applications only need to call this method if
     * the state underlying the filter, other than the record data itself, has changed. Store will
     * re-filter automatically whenever StoreRecord data is updated or modified.
     */
    refreshFilter() {
        this.rebuildFiltered();
    }

    /**
     * Add new Records to this Store in a local, uncommitted state - i.e. with data that has yet to
     * be persisted back to, or sourced from, the server or other data source of record.
     *
     * Note that data objects passed to this method must include a unique ID - callers can generate
     * one with `XH.genId()` if no natural ID can be produced locally on the client.
     *
     * For StoreRecord additions that originate from the server, call `updateData()` instead.
     *
     * @param data - source data for new StoreRecord(s). Note that this data will
     *      *not* be processed by this Store's `processRawData` or `idSpec` functions, but will be
     *      parsed and potentially transformed according to this Store's Field definitions.
     * @param parentId - ID of the pre-existing parent record under which this new
     *      record should be added, if any.
     */
    @action
    addRecords(data: Some<PlainObject>, parentId?: StoreRecordId) {
        data = castArray(data);
        if (isEmpty(data)) return;

        const addRecs = data.map(it => {
            const {id} = it;
            throwIf(isNil(id), `Must provide 'id' property for new records.`);
            throwIf(this.getById(id), `Duplicate id '${id}' provided for new record.`);

            const parsedData = this.parseRaw(it),
                parent = this.getById(parentId);

            return new StoreRecord({
                id,
                store: this,
                raw: null,
                data: parsedData,
                committedData: null,
                parent,
                isSummary: false
            });
        });

        this._current = this._current.withTransaction({add: addRecs});
        this.rebuildFiltered();
    }

    /**
     * Remove Records from the Store in a local, uncommitted state - i.e. when queuing up a set of
     * deletes on the client to be flushed back to the server at a later time.
     *
     * For StoreRecord deletions that originate from the server, call `updateData()` instead.
     *
     * @param records - list of StoreRecord IDs or Records to remove
     */
    @action
    removeRecords(records: StoreRecordOrId | StoreRecordOrId[]) {
        records = castArray(records);
        if (isEmpty(records)) return;

        const idsToRemove = records.map(it => (it instanceof StoreRecord ? it.id : it));

        this._current = this._current
            .withTransaction({remove: idsToRemove})
            .normalize(this._committed);

        this.rebuildFiltered();
    }

    /**
     * Modify individual StoreRecord field values in a local, uncommitted state - i.e. when updating a
     * StoreRecord or Records via an inline grid editor or similar control.
     *
     * This method accepts partial updates for any Records to be modified; modifications need only
     * include the StoreRecord ID and any fields that have changed.
     *
     * For StoreRecord updates that originate from the server, call `updateData()` instead.
     *
     * @param modifications - field-level modifications to apply to existing
     *      Records in this Store. Each object in the list must have an `id` property identifying
     *      the StoreRecord to modify, plus any other properties with updated field values to apply,
     *      e.g. `{id: 4, quantity: 100}, {id: 5, quantity: 99, customer: 'bob'}`.
     * @returns changes applied, or null if no record changes were made.
     */
    @action
    modifyRecords(modifications: Some<PlainObject>): StoreChangeLog {
        modifications = castArray(modifications);
        if (isEmpty(modifications)) return;

        // 1) Pre-process modifications into Records
        const updateMap = new Map<StoreRecordId, StoreRecord>();
        let hadDupes = false;
        modifications.forEach(mod => {
            let {id} = mod;

            // Ignore multiple updates for the same record - we are updating this Store in a
            // transaction after processing all modifications, so this method is not currently setup
            // to process more than one update for a given rec at a time.
            if (updateMap.has(id)) {
                hadDupes = true;
                return;
            }

            const currentRec = this.getOrThrow(id),
                updatedData = this.parseUpdate(currentRec.data, mod);

            // If after parsing, data is deep equal, its a no-op
            if (equal(updatedData, currentRec.data)) return;

            // Previously updated record might now be reverted to clean, normalize
            const committedData =
                currentRec.isModified && equal(currentRec.committedData, updatedData)
                    ? updatedData
                    : currentRec.committedData;

            const updatedRec = new StoreRecord({
                id: currentRec.id,
                store: currentRec.store,
                raw: currentRec.raw,
                data: updatedData,
                committedData: committedData,
                parent: currentRec.parent,
                isSummary: currentRec.isSummary
            });

            if (!equal(currentRec.data, updatedRec.data)) {
                updateMap.set(id, updatedRec);
            }
        });

        if (isEmpty(updateMap)) return null;

        warnIf(
            hadDupes,
            'Store.modifyRecords() called with multiple updates for the same Records. Only the first modification for each StoreRecord was processed.'
        );

        const updateRecs = Array.from(updateMap.values()),
            changeLog: StoreChangeLog = {};

        // 2) Pre-process summary records, peeling them out of updates if needed
        const {summaryRecords} = this;
        let summaryUpdateRecs: StoreRecord[];
        if (!isEmpty(summaryRecords)) {
            summaryUpdateRecs = lodashRemove(updateRecs, ({id}) => some(summaryRecords, {id}));
        }

        if (!isEmpty(summaryUpdateRecs)) {
            this.summaryRecords = summaryUpdateRecs;
            changeLog.summaryRecords = this.summaryRecords;
        }

        // 3) Apply changes
        if (!isEmpty(updateRecs)) {
            this._current = this._current.withTransaction({update: updateRecs});
            changeLog.update = updateRecs;
            this.rebuildFiltered();
        }

        return changeLog;
    }

    /**
     * Revert all changes made to the specified Records since they were last committed.
     *
     * This restores these Records to the state they were in when last loaded into this Store via
     * `loadData()` or `updateData()`, undoing any local modifications that might have been applied.
     *
     * @param records - StoreRecord IDs or instances to revert
     */
    @action
    revertRecords(records: StoreRecordOrId | StoreRecordOrId[]) {
        records = castArray(records);
        if (isEmpty(records)) return;

        const recs = records.map(it => (it instanceof StoreRecord ? it : this.getOrThrow(it))),
            [summaryRecsToRevert, recsToRevert] = partition(recs, 'isSummary');

        if (!isEmpty(summaryRecsToRevert)) {
            this.revertSummaryRecords(summaryRecsToRevert);
        }

        if (!isEmpty(recsToRevert)) {
            this._current = this._current
                .withTransaction({update: recsToRevert.map(r => this.getCommittedOrThrow(r.id))})
                .normalize(this._committed);

            this.rebuildFiltered();
        }
    }

    /**
     * Revert all changes made to the Store since data was last committed.
     *
     * This restores all Records to the state they were in when last loaded into this Store via
     * `loadData()` or `updateData()`, undoing any local modifications that might have been applied,
     * removing any uncommitted records added locally, and restoring any uncommitted deletes.
     */
    @action
    revert() {
        this._current = this._committed;
        if (this.summaryRecords) this.revertSummaryRecords(this.summaryRecords);
        this.rebuildFiltered();
    }

    /** Get a specific Field by name.*/
    getField(name: string): Field {
        return this.fields.find(it => it.name === name);
    }

    get fieldNames(): string[] {
        return this.fields.map(it => it.name);
    }

    /** Records in this store, respecting any filter (if applied).*/
    get records(): StoreRecord[] {
        return this._filtered.list;
    }

    /** All records in this store, unfiltered.*/
    get allRecords(): StoreRecord[] {
        return this._current.list;
    }

    /** All records that were originally loaded into this store.*/
    get committedRecords(): StoreRecord[] {
        return this._committed.list;
    }

    /** Records added locally which have not been committed.*/
    get addedRecords(): StoreRecord[] {
        return this.allRecords.filter(it => it.isAdd);
    }

    /** Records removed locally which have not been committed.*/
    get removedRecords(): StoreRecord[] {
        return differenceBy(this.committedRecords, this.allRecords, 'id');
    }

    /** Records modified locally since they were last loaded. */
    get dirtyRecords(): StoreRecord[] {
        return this.allRecords.filter(it => it.isDirty);
    }

    /** Alias for {@link Store.dirtyRecords} */
    get modifiedRecords(): StoreRecord[] {
        return this.dirtyRecords;
    }

    /**
     * Root records in this store, respecting any filter (if applied).
     * If this store is not hierarchical, this will be identical to 'records'.
     */
    get rootRecords(): StoreRecord[] {
        return this._filtered.rootList;
    }

    /**
     * Root records in this store, unfiltered.
     * If this store is not hierarchical, this will be identical to 'allRecords'.
     */
    get allRootRecords(): StoreRecord[] {
        return this._current.rootList;
    }

    /**
     * Single summary data record, if only one (or null if none). Maintained for convenience and
     * for backwards compat with app code predating support for multiple {@link summaryRecords}.
     */
    get summaryRecord(): StoreRecord {
        if (isNull(this.summaryRecords)) return null;

        throwIf(
            this.summaryRecords.length > 1,
            'Store has multiple summary records - must access via Store.summaryRecords.'
        );
        return first(this.summaryRecords);
    }

    /** True if the store has changes which need to be committed. */
    @computed
    get isDirty(): boolean {
        return (
            this._current !== this._committed ||
            (this.summaryRecords?.some(it => it.isModified) ?? false)
        );
    }

    /** Alias for {@link Store.isDirty} */
    get isModified(): boolean {
        return this.isDirty;
    }

    /**
     * Set a filter on this store.
     *
     * @param filter - one or more filters or configs to create one.  If an
     *      array, a single 'AND' filter will be created.
     */
    @action
    setFilter(filter: FilterLike) {
        filter = parseFilter(filter);
        if (this.filter != filter && !this.filter?.equals(filter)) {
            this.filter = filter;
            this.rebuildFiltered();
        }

        if (!filter) this.setXhFilterText(null);
    }

    @action
    setFilterIncludesChildren(val: boolean) {
        this.filterIncludesChildren = val;
        this.rebuildFiltered();
    }

    /** Convenience method to clear the Filter applied to this store. */
    clearFilter() {
        this.setFilter(null);
    }

    /**
     * @returns true if the StoreRecord is in the store but currently excluded by a filter;
     *      false if the record is either not in the Store at all or not filtered out.
     */
    recordIsFiltered(recOrId: StoreRecordOrId): boolean {
        const id = recOrId instanceof StoreRecord ? recOrId.id : recOrId;
        return !this.getById(id, true) && !!this.getById(id, false);
    }

    /**
     * Set whether the root should be loaded as summary data in loadData().
     */
    setLoadRootAsSummary(loadRootAsSummary: boolean) {
        this.loadRootAsSummary = loadRootAsSummary;
    }

    /** The count of the filtered records in the store. */
    @computed
    get count(): number {
        return this._filtered.count;
    }

    /** The count of all records in the store. */
    @computed
    get allCount(): number {
        return this._current.count;
    }

    /** The count of the filtered root records in the store. */
    @computed
    get rootCount(): number {
        return this._filtered.rootCount;
    }

    /** The count of all root records in the store. */
    @computed
    get allRootCount(): number {
        return this._current.rootCount;
    }

    /** True if the store is empty after filters have been applied */
    @computed
    get empty(): boolean {
        return this._filtered.empty;
    }

    /** True if the store is empty before filters have been applied */
    @computed
    get allEmpty(): boolean {
        return this._current.empty;
    }

    @computed
    get maxDepth(): number {
        return this._current.maxDepth; // maxDepth should not be effected by filtering.
    }

    get errors(): StoreValidationMessagesMap {
        return this.validator.errors;
    }

    get validations(): StoreValidationsMap {
        return this.validator.validations;
    }

    /** Count of all validation errors for the store. */
    get errorCount(): number {
        return this.validator.errorCount;
    }

    /** Array of all errors for this store. */
    get allErrors(): string[] {
        return uniq(flatMapDeep(this.errors, values));
    }

    /** Array of all validations for this store. */
    get allValidations(): Validation[] {
        return uniq(flatMapDeep(this.validations, values));
    }

    /**
     * Get a record by ID, or null if no matching record found.
     *
     * @param id - ID of record to be queried.
     * @param respectFilter - false (default) to return a StoreRecord with the given ID even if an
     *      active filter is excluding it from the primary `records` collection. True to restrict
     *      matches to this Store's post-filter StoreRecord collection only.
     */
    getById(id: StoreRecordId, respectFilter: boolean = false): StoreRecord {
        if (isNil(id)) return null;
        const summaryRecord = this.summaryRecords?.find(it => it.id === id);
        if (summaryRecord) return summaryRecord;

        const rs = respectFilter ? this._filtered : this._current;
        return rs.getById(id);
    }

    /**
     * Get children records for a record.
     *
     * See also the 'children' and 'allChildren' properties on StoreRecord - those getters will likely
     * be more convenient for most app-level callers.
     *
     * @param id - ID of record to be queried.
     * @param respectFilter - true to skip records excluded by any active filter.
     */
    getChildrenById(id: StoreRecordId, respectFilter: boolean = false): StoreRecord[] {
        const rs = respectFilter ? this._filtered : this._current,
            ret = rs.childrenMap.get(id);
        return ret ? ret : [];
    }

    /**
     * Get descendant records for a record.
     *
     * See also the 'descendants' and 'allDescendants' properties on StoreRecord - those getters will
     * likely be more convenient for most app-level callers.
     *
     * @param id - ID of record to be queried.
     * @param respectFilter - true to skip records excluded by any active filter.
     */
    getDescendantsById(id: StoreRecordId, respectFilter = false): StoreRecord[] {
        const rs = respectFilter ? this._filtered : this._current,
            ret = rs.getDescendantsById(id);
        return ret ? ret : [];
    }

    /**
     * Get ancestor records for a record.
     *
     * See also the 'ancestors' and 'allAncestors' properties on StoreRecord - those getters will
     * likely be more convenient for most app-level callers.
     *
     * @param id - ID of record to be queried.
     * @param respectFilter - true to skip records excluded by any active filter.
     */
    getAncestorsById(id: StoreRecordId, respectFilter: boolean = false): StoreRecord[] {
        const rs = respectFilter ? this._filtered : this._current,
            ret = rs.getAncestorsById(id);
        return ret ? ret : [];
    }

    /** True if the store is confirmed to be Valid. */
    get isValid(): boolean {
        return this.validator.isValid;
    }

    /** True if the store is confirmed to be NotValid. */
    get isNotValid(): boolean {
        return this.validator.isNotValid;
    }

    /** Recompute validations for all records and return true if the store is valid. */
    async validateAsync(): Promise<boolean> {
        return this.validator.validateAsync();
    }

    /** Destroy this store, cleaning up any resources used. */
    override destroy() {
        super.destroy();
        instanceManager.unregisterStore(this);
    }

    //--------------------
    // For Implementations
    //--------------------
    protected get defaultFieldClass() {
        return Field;
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    setXhFilterText(s: string) {
        this.xhFilterText = s;
    }

    private getOrThrow(id: StoreRecordId, errorMsg?: string) {
        const ret = this.getById(id);
        if (ret) return ret;

        let msg = `Could not find record with id '${id}'.`;
        if (errorMsg) msg += ` ${errorMsg}`;
        throw XH.exception(msg);
    }

    private getCommittedOrThrow(id: StoreRecordId) {
        const ret = this._committed.getById(id);
        throwIf(!ret, `Could not find committed record with id '${id}'`);
        return ret;
    }

    @action
    private resetRecords() {
        this._committed = this._current = this._filtered = new RecordSet(this);
        this.summaryRecords = null;
    }

    private parseFields(
        fields: Array<string | FieldSpec | Field>,
        defaults: Omit<FieldSpec, 'name'>
    ): Field[] {
        const ret = fields.map(f => {
            if (f instanceof Field) return f;

            let fieldSpec: FieldSpec = isString(f) ? {name: f} : f;

            if (!isEmpty(defaults)) {
                fieldSpec = defaultsDeep({}, fieldSpec, defaults);
            }

            return new this.defaultFieldClass(fieldSpec);
        });

        throwIf(
            ret.some(it => it.name === 'id'),
            `Applications should not specify a field for the id of a record. An id property is created
            automatically for all records. See Store.idSpec for more info.`
        );
        return ret;
    }

    @action
    private rebuildFiltered() {
        this._filtered = this._current.withFilter(this.filter);
    }

    //---------------------------------------
    // StoreRecord Generation
    //---------------------------------------
    private createRecord(
        raw: PlainObject,
        parent: StoreRecord,
        isSummary: boolean = false
    ): StoreRecord {
        const id = this.idSpec(raw);

        // Potentially re-use existing record if raw data is reference equal and tree path identical
        if (this.reuseRecords) {
            const cached = this._committed?.recordMap.get(id);
            if (cached?.raw === raw && equal(cached.parent?.treePath, parent?.treePath)) {
                return cached;
            }
        }

        const {processRawData} = this;
        let data = raw;
        if (processRawData) {
            data = processRawData(raw);
            throwIf(
                !data,
                'Store.processRawData should return an object. If writing/editing, be sure to return a clone!'
            );
        }

        data = this.parseRaw(data);
        const ret = new StoreRecord({
            id,
            store: this,
            raw,
            data,
            committedData: data,
            parent,
            isSummary
        });

        // Finalize summary only.  Non-summary finalized by RecordSet
        if (isSummary) ret.finalize();

        return ret;
    }

    private createRecords(
        rawData: PlainObject[],
        parent: StoreRecord,
        recordMap: Map<StoreRecordId, StoreRecord> = new Map(),
        summaryRecordIds: Set<StoreRecordId> = this.summaryRecordIds
    ) {
        const {loadTreeData, loadTreeDataFrom} = this;

        rawData.forEach(raw => {
            const rec = this.createRecord(raw, parent),
                {id} = rec;

            throwIf(
                recordMap.has(id) || summaryRecordIds.has(id),
                `ID ${id} is not unique. Use the 'Store.idSpec' config to resolve a unique ID for each record.`
            );

            recordMap.set(id, rec);

            if (loadTreeData && raw[loadTreeDataFrom]) {
                this.createRecords(raw[loadTreeDataFrom], rec, recordMap, summaryRecordIds);
            }
        });
        return recordMap;
    }

    private get summaryRecordIds(): Set<StoreRecordId> {
        return new Set(this.summaryRecords?.map(it => it.id) ?? []);
    }

    private parseRaw(data: PlainObject): PlainObject {
        // a) create/prepare the data object
        const ret = Object.create(this._dataDefaults);

        // b) apply parsed data as needed.
        const {_fieldMap} = this;
        forIn(data, (raw, name) => {
            const field = _fieldMap.get(name);
            if (field) {
                const val = field.parseVal(raw);
                if (val !== field.defaultValue) {
                    ret[name] = val;
                }
            }
        });

        return ret;
    }

    private parseUpdate(data: PlainObject, update: PlainObject): PlainObject {
        const {_fieldMap} = this;

        // a) clone the existing object
        const ret = Object.create(this._dataDefaults);
        Object.assign(ret, data);

        // b) apply changes
        forIn(update, (raw, name) => {
            const field = _fieldMap.get(name);
            if (field) {
                const val = field.parseVal(raw);
                if (val !== field.defaultValue) {
                    ret[name] = val;
                } else {
                    delete ret[name];
                }
            }
        });

        return ret;
    }

    private createDataDefaults() {
        const ret = {};
        this.fields.forEach(({name, defaultValue}) => (ret[name] = defaultValue));
        return ret;
    }

    private createFieldMap() {
        const ret = new Map();
        this.fields.forEach(r => ret.set(r.name, r));
        return ret;
    }

    private parseExperimental(experimental) {
        return {
            ...XH.getConf('xhStoreExperimental', {}),
            ...experimental
        };
    }

    private parseIdSpec(idSpec) {
        if (isString(idSpec)) return raw => raw[idSpec];
        if (isFunction(idSpec)) return raw => idSpec(raw);
        throw XH.exception(
            'idSpec should be either a name of a field, or a function to generate an id.'
        );
    }

    @action
    private revertSummaryRecords(records: StoreRecord[]) {
        this.summaryRecords = this.summaryRecords.map(summaryRec => {
            const recToRevert = records.find(it => it.id === summaryRec.id);
            if (!recToRevert) return summaryRec;

            const ret = new StoreRecord({
                id: recToRevert.id,
                store: this,
                raw: recToRevert.raw,
                data: recToRevert.committedData,
                committedData: recToRevert.committedData,
                parent: null,
                isSummary: true
            });
            ret.finalize();
            return ret;
        });
    }
}

//---------------------------------------------------------------------
// Iterate over the properties of a raw data/update  object.
// Does *not* do ownProperty check, faster than lodash forIn/forOwn
//-------------------------------------------------------------------
function forIn(obj, fn) {
    for (let key in obj) {
        fn(obj[key], key);
    }
}

function isChildRawDataObject(obj): boolean {
    return obj.hasOwnProperty('rawData') && obj.hasOwnProperty('parentId');
}
