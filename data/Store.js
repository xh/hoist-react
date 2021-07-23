/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistBase, managed, XH} from '@xh/hoist/core';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {throwIf, warnIf, apiRemoved, logWithDebug} from '@xh/hoist/utils/js';
import equal from 'fast-deep-equal';
import {
    castArray,
    defaultsDeep,
    differenceBy,
    isArray,
    isEmpty,
    isNil,
    isString,
    remove as lodashRemove
} from 'lodash';

import {Field} from './Field';
import {parseFilter} from './filter/Utils';
import {RecordSet} from './impl/RecordSet';
import {StoreValidator} from './impl/StoreValidator';
import {Record} from './Record';

/**
 * A managed and observable set of local, in-memory Records.
 */
export class Store extends HoistBase {

    /** @member {Field[]} */
    fields = null;

    /** @member {function} */
    idSpec;

    /** @member {function} */
    processRawData;

    /** @member {boolean} */
    @observable filterIncludesChildren;

    /** @member {boolean} */
    loadTreeData;

    /** @member {boolean} */
    loadRootAsSummary;

    /** @member {boolean} */
    idEncodesTreePath;

    /** @member {boolean} */
    freezeData;

    /** @member {Filter}  */
    @observable.ref filter;

    /** @member {number} - timestamp (ms) of the last time this store's data was changed. */
    @observable lastUpdated;

    /** @member {?number} - timestamp (ms) of the last time this store's data was loaded.*/
    @observable lastLoaded = null;

    /** @member {Record} - record containing summary data. */
    @observable.ref summaryRecord = null;

    /** @package - used internally by any StoreFilterField that is bound to this store. */
    @bindable xhFilterText = null;

    /** @member {StoreValidator} */
    @managed validator;

    //----------------------
    // Implementation State
    //----------------------
    /** @type {RecordSet} */
    @observable.ref _committed;
    /** @type {RecordSet} */
    @observable.ref _current;
    /** @type {RecordSet} */
    @observable.ref _filtered;

    _dataDefaults = null;

    /**
     * @param {Object} c - Store configuration.
     * @param {(string[]|FieldConfig[]|Field[])} c.fields - Field names, configs, or instances.
     * @param {{}} [fieldDefaults] - default configs applied to `Field` instances constructed
     *      internally by this Store. {@see FieldConfig} for options
     * @param {(function|string)} [c.idSpec] - specification for selecting or producing an immutable
     *      unique id for each record. May be either a string property name (default is 'id') or a
     *      function to create an id from the raw unprocessed data. Will be normalized to a function
     *      upon Store construction. If there is no natural id to select/generate, you can use
     *      `XH.genId` to generate a unique id on the fly. NOTE that in this case, grids and other
     *      components bound to this store will not be able to maintain record state across reloads.
     * @param {function} [c.processRawData] - function to run on each individual data object
     *      presented to loadData() prior to creating a Record from that object. This function
     *      must return an object, cloning the original object if edits are necessary.
     * @param {(Filter|*|*[])} [c.filter] - one or more filters or configs to create one.  If an
     *      array, a single 'AND' filter will be created.
     * @param {boolean} [c.filterIncludesChildren] - true if all children of a passing record should
     *      also be considered passing (default false).
     * @param {boolean} [c.loadTreeData] - true to load hierarchical/tree data. When this flag is
     *      true, the children property on raw data objects will be used to load child records.
     *      (default true).
     * @param {boolean} [c.loadRootAsSummary] - true to treat the root node in hierarchical data as
     *      the summary record (default false).
     * @param {boolean} [c.freezeData] - true to freeze the internal data object of the record.
     *      May be set to false to maximize performance.  Note that the internal data of the record
     *      should in all cases be considered immutable (default true).
     * @param {boolean} [c.idEncodesTreePath] - set to true to indicate that the id for a record
     *      implies a fixed position of the record within the any tree hierarchy.  May be set to
     *      true to maximize performance (default false).
     * @param {Object} [c.experimental] - flags for experimental features. These features are
     *     designed for early client-access and testing, but are not yet part of the Hoist API.
     * @param {Object[]} [c.data] - source data to load.
     */
    constructor({
        fields,
        fieldDefaults = {},
        idSpec = 'id',
        processRawData = null,
        filter = null,
        filterIncludesChildren = false,
        loadTreeData = true,
        loadRootAsSummary = false,
        freezeData = true,
        idEncodesTreePath = false,
        experimental,
        data
    }) {
        super();
        makeObservable(this);
        this.experimental = this.parseExperimental(experimental);
        this.fields = this.parseFields(fields, fieldDefaults);
        this.idSpec = isString(idSpec) ? (data) => data[idSpec] : idSpec;
        this.processRawData = processRawData;
        this.filter = parseFilter(filter);
        this.filterIncludesChildren = filterIncludesChildren;
        this.loadTreeData = loadTreeData;
        this.loadRootAsSummary = loadRootAsSummary;
        this.freezeData = freezeData;
        this.idEncodesTreePath = idEncodesTreePath;
        this.lastUpdated = Date.now();

        this.resetRecords();

        this.validator = new StoreValidator({store: this});
        this._dataDefaults = this.createDataDefaults();
        this._fieldMap = this.createFieldMap();
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
    @logWithDebug
    loadData(rawData, rawSummaryData) {
        // Extract rootSummary if loading non-empty data[] (i.e. not clearing) and loadRootAsSummary
        if (rawData.length !== 0 && this.loadRootAsSummary) {
            throwIf(
                rawData.length !== 1 || rawSummaryData,
                'Incorrect call to loadData with loadRootAsSummary=true. Summary data should be in a single root node with top-level row data as its children.'
            );
            rawSummaryData = rawData[0];
            rawData = rawData[0].children ?? [];
        }

        const records = this.createRecords(rawData, null);
        this._committed = this._current = this._committed.withNewRecords(records);
        this.rebuildFiltered();

        this.summaryRecord = rawSummaryData ?
            this.createRecord(rawSummaryData, null, true) :
            null;

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
     * record. For modifying particular fields on existing Records, see `modifyRecords()`. For local
     * adds/removes not sourced from the server, see `addRecords()` and `removeRecords()`. Those
     * APIs will modify the current RecordSet but leave those changes in an uncommitted state.
     *
     * @param {(Object[]|StoreTransaction)} rawData - data changes to process. If provided as an
     *      array, rawData will be processed into adds and updates, with updates determined by
     *      matching existing records by ID.
     * @returns {Object} - changes applied, or null if no record changes were made.
     */
    @action
    @logWithDebug
    updateData(rawData) {
        if (isEmpty(rawData)) return null;

        const changeLog = {};

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
            updateRecs = update.map(it => {
                const recId = this.idSpec(it),
                    rec = this.getOrThrow(
                        recId,
                        'In order to update grid data, records must have stable ids. Note: XH.genId() will not provide such ids.'
                    ),
                    parent = rec.parent,
                    isSummary = recId === this.summaryRecord?.id;
                return this.createRecord(it, parent, isSummary);
            });
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
            summaryUpdateRec = this.createRecord(rawSummaryData, null, true);
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
     * Re-runs the Filter on the current data. Applications only need to call this method if
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
     * @param {RecordId} [parentId] - ID of the pre-existing parent Record under which this new
     *      Record should be added, if any.
     */
    @action
    addRecords(data, parentId) {
        data = castArray(data);
        if (isEmpty(data)) return;

        const addRecs = data.map(it => {
            const {id} = it;
            throwIf(isNil(id), `Must provide 'id' property for new records.`);
            throwIf(this.getById(id), `Duplicate id '${id}' provided for new record.`);

            const parsedData = this.parseRaw(it),
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
        modifications.forEach(mod => {
            let {id} = mod;

            // Ignore multiple updates for the same record - we are updating this Store in a
            // transaction after processing all modifications, so this method is not currently setup
            // to process more than one update for a given rec at a time.
            if (updateRecs.has(id)) {
                hadDupes = true;
                return;
            }

            const currentRec = this.getOrThrow(id),
                updatedData = this.parseUpdate(currentRec.data, mod);

            const updatedRec = new Record({
                id: currentRec.id,
                raw: currentRec.raw,
                data: updatedData,
                parent: currentRec.parent,
                store: currentRec.store,
                committedData: currentRec.committedData
            });

            if (!equal(currentRec.data, updatedRec.data)) {
                updateRecs.set(id, updatedRec);
            }
        });

        if (isEmpty(updateRecs)) return;

        warnIf(hadDupes, 'Store.modifyRecords() called with multiple updates for the same Records. Only the first modification for each Record was processed.');

        this._current = this._current
            .withTransaction({update: Array.from(updateRecs.values())});

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
     * Get a specific Field by name.
     * @param {string} name - field name to locate.
     * @return {Field}
     */
    getField(name) {
        return this.fields.find(it => it.name === name);
    }

    /** @return {string[]} */
    get fieldNames() {
        return this.fields.map(it => it.name);
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
     * Set a filter on this store.
     *
     * @param {(Filter|*|*[])} filter - one or more filters or configs to create one.  If an
     *      array, a single 'AND' filter will be created.
     */
    @action
    setFilter(filter) {
        filter = parseFilter(filter);
        if (this.filter != filter && !this.filter?.equals(filter)) {
            this.filter = filter;
            this.rebuildFiltered();
        }

        if (!filter) this.setXhFilterText(null);
    }

    @action
    setFilterIncludesChildren(val) {
        this.filterIncludesChildren = val;
        this.rebuildFiltered();
    }

    /** Convenience method to clear the Filter applied to this store. */
    clearFilter() {
        this.setFilter(null);
    }

    /**
     *
     * @param {RecordOrId} recOrId
     * @return {boolean} - true if the Record is in the store, but currently excluded by a filter.
     *      False if the record is either not in the Store at all, or not filtered out.
     */
    recordIsFiltered(recOrId) {
        const id = recOrId.isRecord ? recOrId.id : recOrId;
        return !this.getById(id, true) && !!this.getById(id, false);
    }

    /**
     * Set whether the root should be loaded as summary data in loadData().
     * @param {boolean} loadRootAsSummary
     */
    setLoadRootAsSummary(loadRootAsSummary) {
        this.loadRootAsSummary = loadRootAsSummary;
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
     * @param {RecordId} id
     * @param {boolean} [respectFilter] - false (default) to return a Record with the given
     *      ID even if an active filter is excluding it from the primary `records` collection.
     *      True to restrict matches to this Store's post-filter Record collection only.
     * @return {Record}
     */
    getById(id, respectFilter = false) {
        if (isNil(id)) return null;
        if (id === this.summaryRecord?.id) return this.summaryRecord;

        const rs = respectFilter ? this._filtered : this._current;
        return rs.getById(id);
    }

    /**
     * Get children records for a record.
     *
     * See also the 'children' and 'allChildren' properties on Record - those getters will likely
     * be more convenient for most app-level callers.
     *
     * @param {RecordId} id - ID of Record to be queried.
     * @param {boolean} [respectFilter] - true to skip records excluded by any active filter.
     * @return {Record[]}
     */
    getChildrenById(id, respectFilter = false) {
        const rs = respectFilter ? this._filtered : this._current,
            ret = rs.childrenMap.get(id);
        return ret ? ret : [];
    }

    /**
     * Get descendant records for a record.
     *
     * See also the 'descendants' and 'allDescendants' properties on Record - those getters will
     * likely be more convenient for most app-level callers.
     *
     * @param {RecordId} id - ID of Record to be queried.
     * @param {boolean} [respectFilter] - true to skip records excluded by any active filter.
     * @return {Record[]}
     */
    getDescendantsById(id, respectFilter = false) {
        const rs = respectFilter ? this._filtered : this._current,
            ret = rs.getDescendantsById(id);
        return ret ? ret : [];
    }

    /**
     * Get ancestor records for a record.
     *
     * See also the 'ancestors' and 'allAncestors' properties on Record - those getters will likely
     * be more convenient for most app-level callers.
     *
     * @param {RecordId} id - ID of Record to be queried.
     * @param {boolean} [respectFilter] - true to skip records excluded by any active filter.
     * @return {Record[]}
     */
    getAncestorsById(id, respectFilter = false) {
        const rs = respectFilter ? this._filtered : this._current,
            ret = rs.getAncestorsById(id);
        return ret ? ret : [];
    }

    /** @return {boolean} - true if the store is confirmed to be Valid. */
    get isValid() {
        return this.validator.isValid;
    }

    /** @return {boolean} - true if the store is confirmed to be NotValid. */
    get isNotValid() {
        return this.validator.isNotValid;
    }

    /** @returns {Promise<boolean>} - Recompute validations for all records and return true if the store is valid. */
    async validateAsync() {
        return this.validator.validateAsync();
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
    getOrThrow(id, errorMsg) {
        const ret = this.getById(id);
        if (ret) return ret;

        let msg = `Could not find record with id '${id}'.`;
        if (errorMsg) msg += ` ${errorMsg}`;
        throw XH.exception(msg);
    }

    getCommittedOrThrow(id) {
        const ret = this._committed.getById(id);
        throwIf(!ret, `Could not find committed record with id '${id}'`);
        return ret;
    }

    @action
    resetRecords() {
        this._committed = this._current = this._filtered = new RecordSet(this);
        this.summaryRecord = null;
    }

    parseFields(fields, defaults) {
        const ret = fields.map(f => {
            if (f instanceof Field) return f;

            if (isString(f)) f = {name: f};

            if (!isEmpty(defaults)) {
                f = defaultsDeep({}, f, defaults);
            }

            return new this.defaultFieldClass(f);
        });

        throwIf(
            ret.some(it => it.name === 'id'),
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
        const id = this.idSpec(raw);

        data = this.parseRaw(data);
        const ret = new Record({id, data, raw, parent, store: this, isSummary});

        // Finalize summary only.  Non-summary finalized by RecordSet
        if (isSummary) ret.finalize();

        return ret;
    }

    createRecords(rawData, parent, recordMap = new Map()) {
        const {loadTreeData} = this;
        rawData.forEach(raw => {
            const rec = this.createRecord(raw, parent),
                {id} = rec;

            throwIf(
                recordMap.has(id),
                `ID ${id} is not unique. Use the 'Store.idSpec' config to resolve a unique ID for each record.`
            );

            recordMap.set(id, rec);

            if (loadTreeData && raw.children) {
                this.createRecords(raw.children, rec, recordMap);
            }
        });
        return recordMap;
    }

    parseRaw(data) {
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

    parseUpdate(data, update) {
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

    createDataDefaults() {
        const ret = {};
        this.fields.forEach(({name, defaultValue}) => ret[name] = defaultValue);
        return ret;
    }

    createFieldMap() {
        const ret = new Map();
        this.fields.forEach(r => ret.set(r.name, r));
        return ret;
    }

    parseExperimental(experimental) {
        apiRemoved(experimental?.shareDefaults, 'shareDefaults');
        return {
            ...XH.getConf('xhStoreExperimental', {}),
            ...experimental
        };
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
 * @property {RecordId[]} [remove] - list of ids representing records to be removed.
 *      Any descendents of these records will also be removed.
 * @property {Object} [rawSummaryData] - update to the dedicated summary row for this store.
 *      If the store has its `loadRootAsSummary` flag set to true, the summary record should
 *      instead be provided via the `update` property.
 */
