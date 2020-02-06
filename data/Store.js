/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {action, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import equal from 'fast-deep-equal';
import {
    castArray,
    differenceBy,
    has,
    isArray,
    isEmpty,
    isFunction,
    isNil,
    isPlainObject,
    isString,
    remove as lodashRemove
} from 'lodash';
import {warnIf, withDefault} from '../utils/js';
import {Field} from './Field';
import {RecordSet} from './impl/RecordSet';
import {Record} from './Record';
import {StoreFilter} from './StoreFilter';

/**
 * A managed and observable set of local, in-memory Records.
 */
export class Store {

    /** @member {Field[]} */
    fields = null;
    /** @member {function} */
    idSpec;
    /** @member {function} */
    processRawData;

    /** @member {number} - timestamp (ms) of the last time this store's data was changed. */
    @observable lastUpdated;

    /** @member {number} - timestamp (ms) of the last time this store's data was loaded.*/
    @observable lastLoaded;

    /** @member {Record} - record containing summary data. */
    @observable.ref summaryRecord = null;

    @observable.ref _committed;
    @observable.ref _current;
    @observable.ref _filtered;
    _filter = null;
    _loadRootAsSummary = false;

    /**
     * @param {Object} c - Store configuration.
     * @param {(string[]|Object[]|Field[])} c.fields - Fields, Field names, or Field config objects.
     * @param {(function|string)} [c.idSpec] - specification for selecting or producing an immutable
     *      unique id for each record. May be either a string property name (default is 'id') or a
     *      function to create an id from the raw unprocessed data. Will be normalized to a function
     *      upon Store construction. If there is no natural id to select/generate, you can use
     *      `XH.genId` to generate a unique id on the fly. NOTE that in this case, grids and other
     *      components bound to this store will not be able to maintain record state across reloads.
     * @param {function} [c.processRawData] - function to run on each individual data object
     *      presented to loadData() prior to creating a Record from that object. This function
     *      must return an object, cloning the original object if edits are necessary.
     * @param {(StoreFilter|Object|function)} [c.filter] - initial filter for Records, or a
     *      StoreFilter config to create.
     * @param {boolean} [c.loadRootAsSummary] - true to treat the root node in hierarchical data as
     *      the summary record.
     * @param {Object[]} [c.data] - source data to load
     */
    constructor({
        fields,
        idSpec = 'id',
        processRawData = null,
        filter = null,
        loadRootAsSummary = false,
        data
    }) {
        this.fields = this.parseFields(fields);
        this.idSpec = isString(idSpec) ? (data) => data[idSpec] : idSpec;
        this.processRawData = processRawData;
        this.lastLoaded = this.lastUpdated = Date.now();
        this._loadRootAsSummary = loadRootAsSummary;

        this.resetRecords();
        this.setFilter(filter);

        if (data) this.loadData(data);
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
     * parent's newly assigned Record ID.
     *
     * Note that this process will re-use pre-existing Record object instances if they are present
     * in the new dataset (as identified by their ID), contain the same data, and occupy the same
     * place in any hierarchy across old and new loads. This is to maximize the ability of
     * downstream consumers (e.g. ag-Grid) to recognize Records that have not changed and do not
     * need to be re-evaluated / re-rendered.
     *
     * Summary data can be provided via `rawSummaryData` or as the root data if the Store was
     * created with its `loadRootAsSummary` flag set to true.
     *
     * @param {Object[]} rawData - source data to load
     * @param {Object} [rawSummaryData] - source data for an optional summary record, representing
     *      a custom aggregation to show as a "grand total" for the dataset, if desired.
     */
    @action
    loadData(rawData, rawSummaryData) {
        // Extract rootSummary if loading non-empty data[] (i.e. not clearing) and loadRootAsSummary = true.
        if (rawData.length !== 0 && this._loadRootAsSummary) {
            throwIf(
                rawData.length !== 1 || isEmpty(rawData[0].children) || rawSummaryData,
                'Incorrect call to loadData with loadRootAsSummary=true. Summary data should be in a single root node with top-level row data as its children.'
            );
            rawSummaryData = rawData[0];
            rawData = rawData[0].children;
        }

        const records = this.createRecords(rawData);
        this._committed = this._current = this._committed.withNewRecords(records);
        this.rebuildFiltered();

        if (rawSummaryData) {
            this.summaryRecord = this.createRecord(rawSummaryData, null, true);
        }

        this.lastLoaded = this.lastUpdated = Date.now();
    }

    /**
     * Add, update, or delete Records in this Store. Note that objects passed to this method
     * for adds and updates should have all the raw source data required to create those Records -
     * i.e. they should be in the same form as when passed to `loadData()`. The added/updated
     * source data will be run through this Store's `idSpec` and `processRawData` functions.
     *
     * Adds can also be provided as an object of the form `{rawData, parentId}` to add new Records
     * under a known, pre-existing parent Record. {@see StoreTransaction} for more details.
     *
     * Unlike `loadData()`, existing Records that are *not* included in this update transaction
     * will be left in place and as is.
     *
     * Records loaded or removed via this method will be considered to be "committed", with the
     * expectation that inputs to this method were provided by the server or other data source of
     * record. For modifying particular fields on existing Records, see `modifyData()`. For local
     * adds/removes not sourced from the server, see `addRecords()` and `removeRecords()`. Those
     * APIs will modify the current RecordSet but leave those changes in an uncommitted state.
     *
     * @param {(Object[]|StoreTransaction)} rawData - data changes to process. If provided as an
     *      array, rawData will be processed into adds and updates, with updates determined by
     *      matching existing records by ID.
     * @returns {Object} - changes applied, or null if no record changes were made.
     */
    @action
    updateData(rawData) {
        // Build a transaction object out of a flat list of adds and updates
        let rawTransaction = null;
        if (isArray(rawData)) {
            const update = [], add = [];
            rawData.forEach(it => {
                const recId = this.idSpec(it);
                if (this.getById(recId)) {
                    update.push(it);
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
        let updateRecs, addRecs;
        if (update) {
            updateRecs = update.map(it => this.createRecord(it));
        }
        if (add) {
            addRecs = new Map();
            add.forEach(it => {
                if (it.hasOwnProperty('rawData') && it.hasOwnProperty('parentId')) {
                    const parent = this.getOrThrow(it.parentId);
                    this.createRecords([it.rawData], parent, addRecs);
                } else {
                    this.createRecords([it], null, addRecs);
                }
            });
        }

        // 2) Pre-process summary record, peeling it out of updates if needed
        const {summaryRecord} = this;
        let summaryUpdateRec;
        if (summaryRecord) {
            [summaryUpdateRec] = lodashRemove(updateRecs, {id: summaryRecord.id});
        }

        if (!summaryUpdateRec && rawSummaryData) {
            summaryUpdateRec = this.createRecord({...summaryRecord.raw, ...rawSummaryData}, null, true);
        }

        if (summaryUpdateRec) {
            this.summaryRecord = summaryUpdateRec;
            changeLog.summaryRecord = this.summaryRecord;
        }

        // 3) Apply changes
        let rsTransaction = {};
        if (!isEmpty(updateRecs)) rsTransaction.update = updateRecs;
        if (!isEmpty(addRecs)) rsTransaction.add = Array.from(addRecs.values());
        if (!isEmpty(remove)) rsTransaction.remove = remove;

        if (!isEmpty(rsTransaction)) {

            // Apply updates to the committed RecordSet - these changes are considered to be
            // sourced from the server / source of record and are coming in as committed.
            this._committed = this._committed.withTransaction(rsTransaction);

            if (this.isModified) {
                // If this store had pre-existing local modifications, apply the updates over that
                // local state. This might (or might not) effectively overwrite those local changes,
                // so we normalize against the newly updated committed state to verify if any local
                // modifications remain.
                this._current = this._current.withTransaction(rsTransaction).normalize(this._committed);
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
     * Re-runs the StoreFilter on the current data. Applications only need to call this method if
     * the state underlying the filter, other than the record data itself, has changed. Store will
     * re-filter automatically whenever Record data is updated or modified.
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
     * For Record additions that originate from the server, call `updateData()` instead.
     *
     * @param {(Object[]|Object)} data - source data for new Record(s). Note that this data will
     *      *not* be processed by this Store's `processRawData` or `idSpec` functions, but will be
     *      parsed and potentially transformed according to this Store's Field definitions.
     * @param {(string|number)} [parentId] - ID of the pre-existing parent Record under which this
     *      new Record should be added, if any.
     */
    @action
    addRecords(data, parentId) {
        data = castArray(data);
        if (isEmpty(data)) return;

        const addRecs = data.map(it => {
            const {id} = it;
            throwIf(isNil(id), `Must provide 'id' property for new records.`);
            throwIf(this.getById(id), `Duplicate id '${id}' provided for new record.`);

            const parsedData = this.parseFieldValues(it),
                parent = this.getById(parentId);

            return new Record({id, data: parsedData, store: this, parent, committedData: null});
        });

        this._current = this._current.withTransaction({add: addRecs});
        this.rebuildFiltered();
    }

    /**
     * Remove Records from the Store in a local, uncommitted state - i.e. when queuing up a set of
     * deletes on the client to be flushed back to the server at a later time.
     *
     * For Record deletions that originate from the server, call `updateData()` instead.
     *
     * @param {(number[]|string[]|Record[])} records - list of Record IDs or Records to remove
     */
    @action
    removeRecords(records) {
        records = castArray(records);
        if (isEmpty(records)) return;

        const idsToRemove = records.map(it => (it instanceof Record) ? it.id : it);

        this._current = this._current
            .withTransaction({remove: idsToRemove})
            .normalize(this._committed);

        this.rebuildFiltered();
    }

    /**
     * Modify individual Record field values in a local, uncommitted state - i.e. when updating a
     * Record or Records via an inline grid editor or similar control.
     *
     * This method accepts partial updates for any Records to be modified; modifications need only
     * include the Record ID and any fields that have changed.
     *
     * For Record updates that originate from the server, call `updateData()` instead.
     *
     * @param {(Object[]|Object)} modifications - field-level modifications to apply to existing
     *      Records in this Store. Each object in the list must have an `id` property identifying
     *      the Record to modify, plus any other properties with updated field values to apply,
     *      e.g. `{id: 4, quantity: 100}, {id: 5, quantity: 99, customer: 'bob'}`.
     */
    @action
    modifyRecords(modifications) {
        modifications = castArray(modifications);
        if (isEmpty(modifications)) return;

        const updateRecs = new Map();
        let hadDupes = false;
        modifications.forEach(it => {
            const {id, ...data} = it;

            // Ignore multiple updates for the same record - we are updating this Store in a
            // transaction after processing all modifications, so this method is not currently setup
            // to process more than one update for a given rec at a time.
            if (updateRecs.has(id)) {
                hadDupes = true;
                return;
            }

            const currentRec = this.getOrThrow(id),
                updatedData = this.parseFieldValues(data, true);

            const updatedRec = new Record({
                id: currentRec.id,
                raw: currentRec.raw,
                data: {...currentRec.data, ...updatedData},
                parent: currentRec.parent,
                store: currentRec.store,
                committedData: currentRec.committedData
            });

            // Don't do anything if the record data hasn't actually changed.
            if (equal(currentRec.data, updatedRec.data)) return;

            // If the updated data now matches the committed record data, restore the committed
            // record to properly reflect the (lack of) dirty state.
            if (equal(updatedRec.data, updatedRec.committedData)) {
                updateRecs.set(id, this.getCommittedOrThrow(id));
            } else {
                updateRecs.set(id, updatedRec);
            }
        });

        warnIf(hadDupes, 'Store.modifyRecords() called with multiple updates for the same Records. Only the first modification for each Record was processed.');

        this._current = this._current
            .withTransaction({update: Array.from(updateRecs.values())})
            .normalize(this._committed);

        this.rebuildFiltered();
    }

    /**
     * Revert all changes made to the specified Records since they were last committed.
     *
     * This restores these Records to the state they were in when last loaded into this Store via
     * `loadData()` or `updateData()`, undoing any local modifications that might have been applied.
     *
     * @param {(number[]|string[]|Record[])} records - Record IDs or instances to revert
     */
    @action
    revertRecords(records) {
        records = castArray(records);
        if (isEmpty(records)) return;

        records = records.map(it => (it instanceof Record) ? it : this.getOrThrow(it));

        this._current = this._current
            .withTransaction({update: records.map(it => this.getCommittedOrThrow(it.id))})
            .normalize(this._committed);

        this.rebuildFiltered();
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
        this.rebuildFiltered();
    }

    /**
     * Get a specific Field, by name.
     * @param {string} name - field name to locate.
     * @return {Field}
     */
    getField(name) {
        return this.fields.find(it => it.name === name);
    }

    /**
     * Records in this store, respecting any filter (if applied).
     * @return {Record[]}
     */
    get records() {
        return this._filtered.list;
    }

    /**
     * All records in this store, unfiltered.
     * @return {Record[]}
     */
    get allRecords() {
        return this._current.list;
    }

    /**
     * All records that were originally loaded into this store.
     * @return {Record[]}
     */
    get committedRecords() {
        return this._committed.list;
    }

    /**
     * Records added locally which have not been committed.
     * @returns {Record[]}
     */
    get addedRecords() {
        return this.allRecords.filter(it => it.isAdd);
    }

    /**
     * Records removed locally which have not been committed.
     * @returns {Record[]}
     */
    get removedRecords() {
        return differenceBy(this.committedRecords, this.allRecords, 'id');
    }

    /**
     * Records modified locally since they were last loaded.
     * @returns {Record[]}
     */
    get modifiedRecords() {
        return this.allRecords.filter(it => it.isModified);
    }

    /**
     * Root records in this store, respecting any filter (if applied).
     * If this store is not hierarchical, this will be identical to 'records'.
     *
     * @return {Record[]}
     */
    get rootRecords() {
        return this._filtered.rootList;
    }

    /**
     * Root records in this store, unfiltered.
     * If this store is not hierarchical, this will be identical to 'allRecords'.
     *
     * @return {Record[]}
     */
    get allRootRecords() {
        return this._current.rootList;
    }

    /** @returns {boolean} - true if the store has changes which need to be committed. */
    get isModified() {
        return this._current !== this._committed;
    }

    /**
     * Set filter to be applied.
     * @param {(StoreFilter|Object|function)} filter - StoreFilter to be applied to records, or
     *      config or function to be used to create one.
     */
    setFilter(filter) {
        if (isFunction(filter)) {
            filter = new StoreFilter({fn: filter});
        } else if (isPlainObject(filter)) {
            filter = new StoreFilter(filter);
        }

        this._filter = filter;

        this.rebuildFiltered();
    }

    /**
     * Set whether the root should be loaded as summary data in loadData().
     *
     * @param {boolean}
     */
    setLoadRootAsSummary(val) {
        this._loadRootAsSummary = val;
    }


    /** @returns {StoreFilter} - the current filter (if any) applied to the store. */
    get filter() {
        return this._filter;
    }

    /** @returns {number} - the count of the filtered records in the store. */
    get count() {
        return this._filtered.count;
    }

    /** @returns {number} - the count of all records in the store. */
    get allCount() {
        return this._current.count;
    }

    /** @returns {number} - the count of the filtered root records in the store. */
    get rootCount() {
        return this._filtered.rootCount;
    }

    /** @returns {number} - the count of all root records in the store. */
    get allRootCount() {
        return this._current.rootCount;
    }

    /** @returns {boolean} - true if the store is empty after filters have been applied */
    get empty() {
        return this._filtered.empty;
    }

    /** @returns {boolean} - true if the store is empty before filters have been applied */
    get allEmpty() {
        return this._current.empty;
    }

    /**
     * Get a record by ID, or null if no matching record found.
     *
     * @param {(string|number)} id
     * @param {boolean} [fromFiltered] - true to skip records excluded by any active filter.
     * @return {Record}
     */
    getById(id, fromFiltered = false) {
        if (isNil(id)) return null;
        if (id === this.summaryRecord?.id) return this.summaryRecord;

        const rs = fromFiltered ? this._filtered : this._current;
        return rs.getById(id);
    }

    /**
     * Get children records for a record.
     *
     * See also the 'children' and 'allChildren' properties on Record - those getters will likely
     * be more convenient for most app-level callers.
     *
     * @param {(string|number)} id - id of record to be queried.
     * @param {boolean} [fromFiltered] - true to skip records excluded by any active filter.
     * @return {Record[]}
     */
    getChildrenById(id, fromFiltered = false) {
        const rs = fromFiltered ? this._filtered : this._current,
            ret = rs.childrenMap.get(id);
        return ret ? ret : [];
    }

    /**
     * Get descendant records for a record.
     *
     * See also the 'descendants' and 'allDescendants' properties on Record - those getters will
     * likely be more convenient for most app-level callers.
     *
     * @param {(string|number)} id - id of record to be queried.
     * @param {boolean} [fromFiltered] - true to skip records excluded by any active filter.
     * @return {Record[]}
     */
    getDescendantsById(id, fromFiltered = false) {
        const rs = fromFiltered ? this._filtered : this._current,
            ret = rs.getDescendantsById(id);
        return ret ? ret : [];
    }

    /**
     * Get ancestor records for a record.
     *
     * See also the 'ancestors' and 'allAncestors' properties on Record - those getters will likely
     * be more convenient for most app-level callers.
     *
     * @param {(string|number)} id - id of record to be queried.
     * @param {boolean} [fromFiltered] - true to skip records excluded by any active filter.
     * @return {Record[]}
     */
    getAncestorsById(id, fromFiltered = false) {
        const rs = fromFiltered ? this._filtered : this._current,
            ret = rs.getAncestorsById(id);
        return ret ? ret : [];
    }

    /** Destroy this store, cleaning up any resources used. */
    destroy() {}

    //--------------------
    // For Implementations
    //--------------------
    get defaultFieldClass() {
        return Field;
    }

    //------------------------
    // Private Implementation
    //------------------------

    getOrThrow(id) {
        const ret = this.getById(id);
        throwIf(!ret, `Could not find record with id '${id}'`);
        return ret;
    }

    getCommittedOrThrow(id) {
        const ret = this._committed.getById(id);
        throwIf(!ret, `Could not find committed record with id '${id}'`);
        return ret;
    }

    resetRecords() {
        this._committed = this._current = this._filtered = new RecordSet(this);
        this.summaryRecord = null;
    }

    parseFields(fields) {
        const ret = fields.map(f => {
            if (f instanceof Field) return f;
            if (isString(f)) f = {name: f};
            return new this.defaultFieldClass(f);
        });

        throwIf(
            ret.some(it => it.name == 'id'),
            `Applications should not specify a field for the id of a record. An id property is created
            automatically for all records. See Store.idSpec for more info.`
        );
        return ret;
    }

    @action
    rebuildFiltered() {
        this._filtered = this._current.withFilter(this.filter);
    }

    //---------------------------------------
    // Record Generation
    //---------------------------------------
    createRecord(raw, parent, isSummary) {
        const {processRawData} = this;

        let data = raw;
        if (processRawData) {
            data = processRawData(raw);
            throwIf(!data, 'Store.processRawData should return an object. If writing/editing, be sure to return a clone!');
        }

        // Note idSpec run against raw data here.
        const id = this.idSpec(raw),
            rec = this.getById(id);

        if (rec) {
            // We are creating a record for an update. Lookup our parent record and determine if
            // this is the the summary record based on the current state (if not provided).
            parent = withDefault(parent, rec.parent);
            isSummary = withDefault(isSummary, rec.id === this.summaryRecord?.id);
        }

        data = this.parseFieldValues(data);
        return new Record({id, data, raw, parent, store: this, isSummary});
    }

    createRecords(rawData, parent, recordMap = new Map()) {
        rawData.forEach(raw => {
            const rec = this.createRecord(raw, parent),
                {id} = rec;

            throwIf(
                recordMap.has(id),
                `ID ${id} is not unique. Use the 'Store.idSpec' config to resolve a unique ID for each record.`
            );

            recordMap.set(id, rec);

            if (raw.children) {
                this.createRecords(raw.children, rec, recordMap);
            }
        });
        return recordMap;
    }

    parseFieldValues(data, skipMissingFields = false) {
        const ret = {};
        this.fields.forEach(field => {
            const {name} = field;

            // Sometimes we want to ignore fields which are not present in the data to preserve
            // an undefined value, to allow merging of data with existing data. In these cases we
            // do not want the configured default value for the field to be used, as we are dealing
            // with a partial data object
            if (skipMissingFields && !has(data, field.name)) return;

            ret[name] = field.parseVal(data[name]);
        });
        return ret;
    }
}

/**
 * @typedef {Object} StoreTransaction - object representing data changes to perform on a Store's
 *      committed record set in a single transaction.
 * @property {Object[]} [update] - list of raw data objects representing records to be updated.
 *      Updates must be matched to existing records by id in order to be applied. The form of the
 *      update objects should be the same as presented to loadData(), with the exception that any
 *      children property will be ignored, and any existing children for the record being updated
 *      will be preserved. If the record is a child, the new updated instance will be assigned to
 *      the same parent. (Meaning: parent/child relationships *cannot* be modified via updates.)
 * @property {Object[]} [add] - list of raw data representing records to be added, Each top-level
 *      item in the array must be either a rawData object of the form passed to loadData or
 *      a wrapper object of the form `{parentId: x, rawData: {}}`, where `parentId` provides
 *      a pointer to the intended parent if the record is not to be added to the root. The rawData
 *      *can* include a children property that will be processed into new child records.
 *      (Meaning: adds can be used to add new branches to the tree.)
 * @property {(string[]|number[])} [remove] - list of ids representing records to be removed.
 *      Any descendents of these records will also be removed.
 * @property {Object} [rawSummaryData] - update to the dedicated summary row for this store.
 *      If the store has its `loadRootAsSummary` flag set to true, the summary record should
 *      instead be provided via the `update` property.
 */
