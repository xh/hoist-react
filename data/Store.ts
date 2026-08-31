/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import type {GridFilterBindTarget} from '@xh/hoist/cmp/grid';
import {AnyIterable, HoistBase, managed, PlainObject, Some, XH} from '@xh/hoist/core';
import {
    Field,
    FieldSpec,
    Filter,
    FilterBindTarget,
    FilterLike,
    FilterValueSource,
    flattenFilter,
    parseFilter,
    StoreRecord,
    StoreRecordDigest,
    StoreRecordId,
    StoreRecordOrId,
    StoreValidationMessagesMap,
    StoreValidationResultsMap,
    ValidationResult
} from '@xh/hoist/data';
import {StoreValidator} from '@xh/hoist/data/impl/StoreValidator';
import {action, computed, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {throwIf, warnIf} from '@xh/hoist/utils/js';
import equal from 'fast-deep-equal';
import {
    castArray,
    compact,
    defaultsDeep,
    differenceBy,
    first,
    flatMapDeep,
    isArray,
    isEmpty,
    isFunction,
    isNil,
    isNull,
    isString,
    map,
    partition,
    remove as lodashRemove,
    uniq,
    values
} from 'lodash';
import type {View} from './cube/View';
import {instanceManager} from '../core/impl/InstanceManager';
import {installCalculatedFieldGetters, installSourceFieldGetters} from './impl/FieldGetterSupport';
import {RecordSet} from './impl/RecordSet';
import {StoreDiagnostics} from './impl/StoreDiagnostics';

/**
 * Populated (non-default) field count at/above which a record's `data` is considered dense and
 * cloned from a shared template carrying every Field, giving all such records one fixed shape.
 * Records below it take the sparse form - own properties for non-default values only, defaults
 * via a shared prototype. See `buildData()`.
 *
 * The cutoff tracks V8's dictionary-mode demotion: objects built by keyed property adds are
 * demoted to a memory-hungry per-object hashtable at ~20 adds, as measured empirically - an
 * undocumented heuristic, so this sits just below it, leaving room for the `id` property
 * later added to every record's data. Overridable via `experimental.denseRecordThreshold` - set
 * to e.g. 999 (above any field count) to force the sparse form for all records (the pre-v87
 * behavior), or to 1 to force the fixed shape for all.
 */
const DENSE_RECORD_THRESHOLD = 20;

/**
 * Configuration for a {@link Store}. At minimum, provide `fields` (or let them be inferred
 * from GridModel columns). Data can be supplied at construction via `data`, or loaded later
 * via `Store.loadData()`.
 *
 * Can also be passed inline as the `store` config on {@link GridConfig}, where it will be
 * used to construct a Store automatically.
 *
 * See the data package README (`data/README.md`) for tree data, filtering, validation, and
 * performance tuning guidance.
 *
 * @see Store
 * @see FieldSpec
 */
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
     * Function to pre-process individual data objects presented to `loadData()` prior to creating
     * a `StoreRecord` from that object. For efficiency, apps may mutate and return the passed
     * object in place - typically the raw data is transient (e.g. freshly fetched) and there is
     * no need to allocate a clone. If the app *does* cache, share, or otherwise
     * re-use the raw data, be careful to return a modified clone instead.
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
     * Specification for a *digest* derived from each incoming raw object and snapshotted on the
     * record when built - a performance optimization for large datasets whose provider can cheaply
     * identify unchanged records across loads and updates.
     *
     * By default (null), Store reuses existing StoreRecord instances when new data is loaded or
     * updated with matching IDs and identical field values (determined via equality comparison).
     * This preserves row state in grids for unchanged records.
     *
     * Set this config to supply a cheaper, stronger signal for that reuse. A record is reused
     * whenever a later raw object for its id yields an equal digest, skipping raw data processing,
     * parsing, and construction entirely:
     *
     *   - string - the digest is the named raw property, e.g. a server-provided timestamp or
     *     sequence number.
     *   - function - the digest is the returned value. Return null to disqualify a row from reuse.
     *
     * Digests must be primitives, compared via `===` - build composite keys as strings (e.g.
     * `raw => raw.type + '|' + raw.seq`) and digest timestamps as epoch ms, not `Date`s. A provider
     * that caches and re-supplies its own row objects should stamp each row with a revision it
     * bumps on every mutation, and digest that - a stamp is the only signal that distinguishes an
     * unchanged row from one mutated in place.
     *
     * Applies to `loadData()` and `updateData()` alike - an update yielding an unchanged digest
     * is dropped from the transaction as a no-op, intentionally preserving any uncommitted local
     * modifications on the record. An update with a changed digest builds a new record and
     * overwrites local modifications, as updates otherwise always do.
     *
     * Stores connected to a Cube {@link View} must leave this config unset - the View manages
     * reuse automatically, installing a digest that reads the stamp it maintains on every row
     * it publishes. Any explicit value throws at connection.
     *
     * Should not be used with a `processRawData` function that depends on external state as that
     * function will be bypassed for reused records.
     *
     * Default null.
     */
    digestSpec?: StoreRecordDigestSpec;

    /**
     * True (default) to have each StoreRecord retain a reference to the raw data object from
     * which it was created, exposed as `StoreRecord.raw`. May be set to false to reduce memory
     * usage on large stores - raw data objects are then eligible for garbage collection after
     * parsing, and `StoreRecord.raw` will be null.
     */
    retainRaw?: boolean;

    /**
     * True to mark this store as a read-only projection of data owned and parsed elsewhere.
     * Default null. Stores connected to a Cube {@link View} are always projections - the
     * connecting View sets this flag itself, and throws on an explicit `false` or a
     * `processRawData` function.
     *
     * Each incoming raw object is used *as* its record's `data`, by reference, skipping the
     * per-record parse and copy on every load and update. Raw data must already match what the
     * Store's Fields would parse - `type`, `parseVal`, and `defaultValue` are not applied. The
     * Store never modifies or freezes these objects (regardless of `freezeData`), leaving the
     * provider free to mutate rows in place. Rows re-supplied by reference are therefore always
     * treated as changed - no value comparison can detect an in-place mutation. A provider that
     * retains and mutates its own rows should supply a `digestSpec` - the only signal that
     * restores record reuse for such rows.
     *
     * `data` will carry every key on the raw object, not just declared Fields - but only declared
     * Field values participate in the equality checks `loadData()`/`updateData()` use to detect
     * unchanged records for reuse. As a read-only projection, local modification APIs
     * (`addRecords`, `modifyRecords`, `removeRecords`, `revertRecords`, and `revert`) throw -
     * data updates flow in via `loadData()`/`updateData()`.
     * Not compatible with `processRawData`.
     */
    projectionOnly?: boolean;

    /**
     * Set to true to always validate all uncommitted records on every change to
     * uncommitted records (add, modify, or remove). Default false.
     */
    validationIsComplex?: boolean;

    /**
     *  Flags for experimental features. These features are designed for early client-access and
     *  testing, but are not yet part of the Hoist API. Currently includes:
     *   - `maxPatchRatio` - max size of a RecordSet patch layer as a fraction of total records,
     *     clamped to [0, 0.5] (default 0, disabling patching). Set to e.g. 0.1 to make
     *     transaction, filtering, and grid-sync costs scale with the size of the change rather
     *     than the size of the store. Note record order then becomes stable-by-incumbency rather
     *     than source-order: existing records keep their positions and additions append, including
     *     records entering a filter incrementally and adds within partial reloads. Apply a grid
     *     sort where deterministic order matters. The ratio is read live on each operation, so
     *     it may also be changed on an existing Store at any time.
     */
    experimental?: PlainObject;
}

/**
 * App-wide defaults for {@link Store}, applied to every Store constructed without an explicit
 * value - including those Hoist itself creates internally. Limited to configs appropriate for
 * every Store in an app.
 */
export interface StoreDefaults {
    freezeData?: boolean;
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

    /**
     * Names of every field whose value changed across the `update` rows, when the producer can
     * supply them cheaply. Providing this asserts that updates change record values only - no
     * structural/parent changes - and that no field outside the set changed. Enables downstream
     * consumers (e.g. Grid) to prove a change cannot affect sort order and skip re-sorting.
     */
    changedFields?: Set<string>;
}

/**
 * Collection of changes made to a Store's RecordSet. Unlike `StoreTransaction` which is used to
 * specify changes, this object is used to report the actual changes made in a single transaction.
 * Removed records are as they existed prior to removal - no longer resolvable by id.
 */
export interface StoreChangeLog {
    update?: StoreRecord[];
    add?: StoreRecord[];
    remove?: StoreRecord[];
    summaryRecords?: StoreRecord[];
}

export interface ChildRawData {
    /** ID of the pre-existing parent record. */
    parentId: string;

    /**
     * Data for the child record to be added. Can include a `children` property to be processed
     * into new (grand)child records.
     */
    rawData: PlainObject;
}

export type StoreRecordIdSpec = string | ((data: PlainObject) => StoreRecordId);
export type StoreRecordDigestSpec = string | ((data: PlainObject) => StoreRecordDigest);

/**
 * A managed, observable collection of in-memory {@link StoreRecord}s - the core data container
 * in Hoist. Used directly by applications and as the data source for {@link GridModel},
 * {@link DataViewModel}, and other data-bound components.
 *
 * Stores provide:
 * - Observable record collections with filtering via composable {@link Filter} objects
 * - Hierarchical/tree data with parent-child navigation
 * - Local modification tracking (add/modify/remove) with commit/revert
 * - Record reuse across data reloads to preserve grid row state
 * - Pluggable validation via {@link Field} rules
 *
 * Data is loaded via `loadData()` (full replacement) or `updateData()` (transactional). Fields
 * can be defined explicitly or inferred from GridModel columns. `Store.defaults` provides
 * app-wide configuration.
 *
 * Record `data` objects are automatically memory-optimized - read them by field name and never
 * enumerate them directly. See {@link StoreRecord.data}, and the experimental
 * `denseRecordThreshold` config to adjust or disable the optimization for testing.
 *
 * See the data package README (`data/README.md`) for full documentation including tree data,
 * filtering patterns, validation, and common pitfalls.
 *
 * @see StoreConfig
 * @see StoreRecord
 * @see Field
 *
 * @mcpHint in-memory data store used by grids and other data components
 */
export class Store
    extends HoistBase
    implements FilterBindTarget, FilterValueSource, GridFilterBindTarget
{
    /** App-level defaults for Store. Instance config takes precedence. */
    static defaults: StoreDefaults = {
        freezeData: true
    };

    static isStore(obj: unknown): obj is Store {
        return obj instanceof Store;
    }

    readonly isFilterValueSource = true;

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
    retainRaw: boolean;
    projectionOnly: boolean; // Not readonly - see connectView().
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

    private _dataTemplate: PlainObject = null;
    private _dataDefaults: PlainObject = null;
    private _denseRecordThreshold: number;
    private _digestSpec: StoreRecordDigestSpec;
    private _digestFn: (raw: PlainObject) => StoreRecordDigest;

    // Calculated field support - see generateDataConfig().
    private _calculatedFields: Field[] = [];
    private _hasCalculatedFields = false;
    private _equalityFields: Field[] = [];
    private _calculatedFieldNames: Set<string> = null;
    private _externalCalculatedFieldNames: Set<string> = null;
    private _projectionDataClass: new (src: PlainObject) => PlainObject = null;
    private _denseDataClass: new () => PlainObject = null;

    // Last parent pair verified position-equal by positionUnchanged().
    private _verifiedCachedParent: StoreRecord = null;
    private _verifiedNewParent: StoreRecord = null;

    // Scratch state shared by parseOrRescue/parseUpdate - the first `n` entries of the parallel
    // name/value buffers are the current record's non-default fields, filled and fully consumed
    // within a single call to avoid allocation during parsing. See buildData(). Not reentrant -
    // an app-supplied `Field.parseVal` must not trigger record builds on this same Store.
    private _recordBuildData = {names: [] as string[], vals: [] as any[], n: 0};

    _created = Date.now();
    private _fieldMap: Map<string, Field>;
    experimental: any;

    /** @internal */
    readonly diagnostics = new StoreDiagnostics(this);

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
        freezeData = Store.defaults.freezeData,
        idEncodesTreePath = false,
        digestSpec = null,
        retainRaw = true,
        projectionOnly = null,
        validationIsComplex = false,
        experimental,
        data
    }: StoreConfig) {
        super();
        makeObservable(this);
        throwIf(
            projectionOnly && processRawData,
            'Store.projectionOnly cannot be used with processRawData - a projection adopts data already parsed by its provider.'
        );

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
        this.digestSpec = digestSpec;
        this.retainRaw = retainRaw;
        this.projectionOnly = projectionOnly;
        this.validationIsComplex = validationIsComplex;
        this.lastUpdated = Date.now();

        this.resetRecords();

        this.validator = new StoreValidator({store: this});
        this.generateDataConfig();
        this._denseRecordThreshold =
            this.experimental.denseRecordThreshold ?? DENSE_RECORD_THRESHOLD;
        if (data) this.loadData(data);

        instanceManager.registerStore(this);
    }

    /** See {@link StoreConfig.digestSpec} - settable, taking effect on the next load. */
    get digestSpec(): StoreRecordDigestSpec {
        return this._digestSpec;
    }

    set digestSpec(spec: StoreRecordDigestSpec) {
        this._digestSpec = spec;
        this._digestFn = this.createDigestFn();
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
     * Note that record order is not a guaranteed property of a Store. Loads are free to preserve
     * incumbent record positions, and a payload differing from the current dataset only in its
     * ordering will be processed as a no-op. Apply an explicit sort - e.g. on an ordinal field
     * supplied with the source data - wherever deterministic order matters.
     *
     * Summary data can be provided via `rawSummaryData` or as the root data if the Store was
     * created with its `loadRootAsSummary` flag set to true.
     *
     * @param rawData - source data to load
     * @param rawSummaryData - source data for optional summary record(s), representing
     *      custom aggregations for the dataset, if desired.
     */
    @action
    loadData(rawData: PlainObject[], rawSummaryData?: Some<PlainObject>) {
        const start = performance.now();

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

        const {_committed, _current} = this,
            records = this.createRecords(rawData, null),
            updated = _committed.withNewRecords(records);

        this.diagnostics.noteLoad(updated, _committed, start);

        // Skip downstream work on no-change reloads, unless local mods are being discarded.
        if (updated !== _committed || updated !== _current) {
            this._committed = this._current = updated;
            this.incrementalRefilter();
        } else if (this.filterReferencesCalculatedFields()) {
            // Replaced summary records can move calculated values (and thus filter membership)
            // even when the reload changed no records.
            this.fullRefilter();
        }

        this.lastLoaded = this.lastUpdated = Date.now();
    }

    /**
     * Load a new and complete dataset from a streaming source, replacing any/all pre-existing
     * Records as needed - the streaming counterpart to {@link loadData}.
     *
     * Use to load very large datasets without buffering the complete raw dataset in a single
     * array - e.g. rows streamed incrementally from the server. The source may be a sync or
     * async iterable yielding individual raw records - see {@link FetchService.fetchNdjson}
     * for the natural source when streaming NDJSON, e.g.
     * `store.loadDataAsync(XH.fetchNdjson({url}).lines)`.
     *
     * The Store is not modified until the source has been fully consumed - all records are then
     * installed in a single observable transaction, exactly as with `loadData()`. If the source
     * throws, the Store remains unchanged.
     *
     * Note this method does not accept summary data - a summary is an aggregate, unavailable
     * until a stream completes. Any pre-existing summary records are cleared. Install summary
     * data via `updateData({rawSummaryData})` after loading, if desired. Not supported for
     * stores with `loadRootAsSummary` - such payloads nest all row data within a single root
     * node and cannot be streamed.
     *
     * @param rawData - iterable yielding raw records.
     */
    async loadDataAsync(rawData: AnyIterable<PlainObject>): Promise<void> {
        throwIf(
            this.loadRootAsSummary,
            'loadDataAsync does not support loadRootAsSummary - load via loadData(), or install summary records separately via updateData().'
        );

        const start = performance.now(),
            recordMap = new Map<StoreRecordId, StoreRecord>(),
            summaryIds = new Set<StoreRecordId>();

        for await (const raw of rawData) {
            this.createRecordDeep(raw, null, recordMap, summaryIds);
        }

        runInAction(() => {
            this.summaryRecords = null;
            const {_committed, _current} = this,
                updated = _committed.withNewRecords(recordMap);

            this.diagnostics.noteLoad(updated, _committed, start);

            if (updated !== _committed || updated !== _current) {
                this._committed = this._current = updated;
                this.incrementalRefilter();
            }
            this.lastLoaded = this.lastUpdated = Date.now();
        });
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
    updateData(rawData: PlainObject[] | StoreTransaction): StoreChangeLog {
        if (isEmpty(rawData)) return null;

        const start = performance.now(),
            changeLog: StoreChangeLog = {};

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

        const {update, add, remove, rawSummaryData, changedFields, ...other} = rawTransaction;
        throwIf(!isEmpty(other), 'Unknown argument(s) passed to updateData().');

        // 1) Pre-process updates and adds into Records
        let updateRecs: StoreRecord[], addRecs: Map<StoreRecordId, StoreRecord>;
        if (update) {
            updateRecs = [];
            update.forEach(it => {
                const recId = this.idSpec(it),
                    rec = this.getOrThrow(
                        recId,
                        'In order to update grid data, records must have stable ids. Note: XH.genId() will not provide such ids.'
                    ),
                    parent = rec.parent,
                    isSummary = this.summaryRecordIds.has(recId),
                    newRec = this.createRecord(it, parent, isSummary);

                // Reused/rescued records signal unchanged data - drop such updates as no-ops.
                if (newRec !== this._committed?.getById(recId)) updateRecs.push(newRec);
            });
        }
        if (add) {
            addRecs = new Map();
            add.forEach(it => {
                if (isChildRawDataObject(it)) {
                    const {rawData, parentId} = it,
                        parent = !isNil(parentId) ? this.getOrThrow(parentId) : null;
                    this.createRecordDeep(rawData, parent, addRecs);
                } else {
                    this.createRecordDeep(it, null, addRecs);
                }
            });
        }

        // 2) Pre-process summary records, peeling them out of updates if needed
        const {summaryRecords} = this;
        let summaryUpdateRecs: StoreRecord[];
        if (!isEmpty(summaryRecords)) {
            summaryUpdateRecs = lodashRemove(updateRecs, ({id}) => this.summaryRecordIds.has(id));
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
            changedFields?: Set<string>;
        } = {};
        if (!isEmpty(updateRecs)) rsTransaction.update = updateRecs;
        if (!isEmpty(addRecs)) rsTransaction.add = Array.from(addRecs.values());
        if (!isEmpty(remove)) rsTransaction.remove = remove;
        if (changedFields && rsTransaction.update) rsTransaction.changedFields = changedFields;

        const hasChanges = !isEmpty(rsTransaction),
            prevCurrent = this._current;
        if (hasChanges) {
            // Prepare changelog up front - removed records are unresolvable post-removal.
            const {update, add, remove: removeIds} = rsTransaction;
            if (update) changeLog.update = update;
            if (add) changeLog.add = add;
            if (removeIds) changeLog.remove = compact(removeIds.map(id => this.getById(id)));

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
        }
        this.diagnostics.noteUpdate(this._current, prevCurrent, start);

        if (hasChanges) {
            this.incrementalRefilter();
        } else if (changeLog.summaryRecords && this.filterReferencesCalculatedFields()) {
            // A summary-only update can move calculated values (and thus filter membership)
            // without any record transaction to trigger the refilter above.
            this.fullRefilter();
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
        this.fullRefilter();
    }

    /**
     * Add new Records to this Store in a local, uncommitted state - i.e. with data that has yet to
     * be persisted back to, or sourced from, the server or other data source of record.
     *
     * Note that data objects passed to this method must include a literal `id` property - this
     * method does *not* run the Store's `idSpec` function. Callers can generate an id with
     * `XH.genId()` if no natural ID can be produced locally on the client.
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
        this.throwIfProjectionOnly('addRecords');
        const rawRecords = castArray(data);
        if (isEmpty(rawRecords)) return;

        const addRecs = rawRecords.map(it => {
            const {id} = it;
            throwIf(isNil(id), `Must provide 'id' property for new records.`);
            throwIf(this.getById(id), `Duplicate id '${id}' provided for new record.`);

            const parsedData = this.parseOrRescue(it),
                parent = this.getById(parentId);

            return new StoreRecord({
                id,
                store: this,
                raw: null,
                data: parsedData,
                committedData: null,
                parent,
                isSummary: false,
                nonDefaultCount: this._recordBuildData.n
            });
        });

        this._current = this._current.withTransaction({add: addRecs});
        this.incrementalRefilter();
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
        this.throwIfProjectionOnly('removeRecords');
        records = castArray(records);
        if (isEmpty(records)) return;

        const idsToRemove = records.map(it => (it instanceof StoreRecord ? it.id : it));

        this._current = this._current
            .withTransaction({remove: idsToRemove})
            .normalize(this._committed);

        this.incrementalRefilter();
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
        this.throwIfProjectionOnly('modifyRecords');
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
                isSummary: currentRec.isSummary,
                nonDefaultCount: this._recordBuildData.n
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
            summaryUpdateRecs = lodashRemove(updateRecs, ({id}) => this.summaryRecordIds.has(id));
        }

        if (!isEmpty(summaryUpdateRecs)) {
            this.summaryRecords = summaryUpdateRecs;
            changeLog.summaryRecords = this.summaryRecords;
        }

        // 3) Apply changes
        if (!isEmpty(updateRecs)) {
            this._current = this._current.withTransaction({update: updateRecs});
            changeLog.update = updateRecs;
            this.incrementalRefilter();
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
        this.throwIfProjectionOnly('revertRecords');
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

            this.incrementalRefilter();
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
        this.throwIfProjectionOnly('revert');
        this._current = this._committed;
        if (this.summaryRecords) this.revertSummaryRecords(this.summaryRecords);
        this.incrementalRefilter();
    }

    /** Get a specific Field by name.*/
    getField(name: string): Field {
        return this.fields.find(it => it.name === name);
    }

    get fieldNames(): string[] {
        return this.fields.map(it => it.name);
    }

    /**
     * Names of all fields on this Store whose values are computed at read time rather than
     * loaded - fields declared with {@link FieldSpec.calculatedFn}, plus any marked by a
     * connected Cube View publishing view-level calculated fields into this Store. Grids bound
     * to this Store use this set to automatically repaint calculated columns after each data
     * transaction.
     */
    get calculatedFieldNames(): Set<string> {
        return (this._calculatedFieldNames ??= new Set([
            ...this._calculatedFields.map(it => it.name),
            ...(this._externalCalculatedFieldNames ?? [])
        ]));
    }

    /**
     * Adopt the configuration required of a Store connected to a Cube {@link View} - a read-only
     * projection carrying the View's row digest and calculated field names. Called by the View
     * on connection and on query changes (idempotent); throws on conflicting app config.
     * @internal
     */
    connectView(view: View) {
        throwIf(
            this.digestSpec != null && this.digestSpec !== 'cubeRowDigest',
            '`Store.digestSpec` cannot be configured on a Store connected to a Cube View - the View manages record reuse automatically, installing its own row-based digest. Leave unset.'
        );
        this.digestSpec = 'cubeRowDigest';

        throwIf(
            this.idEncodesTreePath,
            '`Store.idEncodesTreePath` cannot be configured on a Store connected to a Cube View - view row ids do not encode a fixed tree position. Leave unset.'
        );

        // Connected stores adopt rows the View has already parsed - always projections.
        throwIf(
            this.projectionOnly === false || this.processRawData,
            'Stores connected to a Cube View are always read-only projections, adopting view rows by reference - remove any `projectionOnly: false` or `processRawData` config. Route edits through the Cube, and derive additional values via calculated fields.'
        );
        if (!this.projectionOnly) {
            this.projectionOnly = true;
            this.generateDataConfig();
        }

        this.setExternalCalculatedFieldNames(new Set(map(view._calcFields, 'name')));
    }

    /**
     * Clear connected-View state that would otherwise outlive a destroyed View - called by the
     * View on destroy. This store remains a projection holding its last-loaded rows.
     * @internal
     */
    disconnectView() {
        this.setExternalCalculatedFieldNames(null);
    }

    /** Mark external read-time-computed fields, e.g. a connected View's calculated fields. */
    private setExternalCalculatedFieldNames(names: Set<string>) {
        this._externalCalculatedFieldNames = names?.size ? names : null;
        this._calculatedFieldNames = null;
    }

    /**
     * Records in this store, respecting any filter (if applied).
     * Order is not a guaranteed property of a Store - sort explicitly where order matters.
     */
    get records(): StoreRecord[] {
        return this._filtered.list;
    }

    /**
     * All records in this store, unfiltered.
     * Order is not a guaranteed property of a Store - sort explicitly where order matters.
     */
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
            this.incrementalRefilter();
        }

        if (!filter) this.setXhFilterText(null);
    }

    @action
    setFilterIncludesChildren(val: boolean) {
        this.filterIncludesChildren = val;
        this.fullRefilter();
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

    getValuesForFieldFilter(fieldName: string, filter?: Filter): any[] {
        const field = this.getField(fieldName);
        if (!field) return [];

        let recs = this.allRecords;
        if (filter) {
            const testFn = filter.getTestFn(this);
            recs = recs.filter(testFn);
        }

        const ret = new Set();
        recs.forEach(rec => {
            const val = rec.get(fieldName);
            if (isNil(val)) {
                ret.add(null);
            } else if (field.type === 'tags') {
                val.forEach(it => ret.add(it));
            } else {
                ret.add(val);
            }
        });

        return Array.from(ret);
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

    get validationResults(): StoreValidationResultsMap {
        return this.validator.validationResults;
    }

    /** Count of all validation errors for the store. */
    get errorCount(): number {
        return this.validator.errorCount;
    }

    /** Array of all errors for this store. */
    get allErrors(): string[] {
        return uniq(flatMapDeep(this.errors, values));
    }

    /** Array of all ValidationResults for this store. */
    get allValidationResults(): ValidationResult[] {
        return uniq(flatMapDeep(this.validationResults, values));
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
        const rs = respectFilter ? this._filtered : this._current;
        return rs.getById(id) ?? this.summaryRecords?.find(it => it.id === id);
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

    /** Recompute ValidationResults for all records and return true if the store is valid. */
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
        throwIf(
            ret.some(it => it.name === '__proto__'),
            `Applications must not specify a field named '__proto__' - assigning it would replace the
            prototype of each record's data object rather than setting a value on it.`
        );
        return ret;
    }

    @action
    private incrementalRefilter() {
        // A filter testing a calculated field must re-test every record on each transaction - a
        // calculated value can cross the filter threshold via an input outside any transacted
        // row (e.g. a moving summary denominator), which incremental re-testing of transacted
        // records alone would leave stale. O(N), only while such a filter is active.
        if (this.filterReferencesCalculatedFields()) {
            this.fullRefilter();
            return;
        }

        const start = performance.now(),
            {_current, _filtered: prevFiltered} = this;
        this._filtered = _current.withFilter(this.filter, prevFiltered);
        this.diagnostics.noteFilter(this._filtered, _current, prevFiltered, start);
    }

    private filterReferencesCalculatedFields(): boolean {
        const {filter} = this;
        if (!filter) return false;

        const calcNames = this.calculatedFieldNames;
        if (!calcNames.size) return false;

        // FieldFilters (nested at any depth) declare their field. FunctionFilters are opaque to
        // this detection - one reading calculated values may require a manual refreshFilter()
        // when external inputs change.
        return flattenFilter(filter).some(it => calcNames.has((it as any).field));
    }

    @action
    private fullRefilter() {
        const start = performance.now(),
            {_current} = this;
        this._filtered = _current.withFilter(this.filter, null);
        this.diagnostics.noteFilter(this._filtered, _current, null, start);
    }

    //---------------------------------------
    // StoreRecord Generation
    //---------------------------------------
    private createRecord(
        raw: PlainObject,
        parent: StoreRecord,
        isSummary: boolean = false
    ): StoreRecord {
        let id = this.idSpec(raw),
            digest = this._digestFn?.(raw),
            cached = this.getCachedRecord(id, parent);

        // 1) A digest rescues or disqualifies a cached record immediately
        if (digest != null) {
            if (cached?.digest === digest) return cached;
            cached = null;
        }

        // 2) Projections adopt raw data with no reparsing. Value identical rows
        // can be re-used (instance identical reuse requires a digest above). Calculated fields
        // are excluded from the comparison - computed values carry no signal of their own.
        if (this.projectionOnly) {
            const cachedData = cached?.data;
            if (
                cachedData &&
                raw !== cached.raw &&
                this._equalityFields.every(({name}) => equal(raw[name], cachedData[name]))
            ) {
                return cached;
            }

            // With calculated fields, adopt the raw via a generated wrapper carrying their
            // getters (data !== raw) - otherwise adopt the raw object itself, as-is.
            const {_projectionDataClass} = this,
                data = _projectionDataClass ? new _projectionDataClass(raw) : raw;
            return new StoreRecord({
                id,
                store: this,
                raw,
                data,
                committedData: data,
                parent,
                isSummary,
                digest
            });
        }

        // 3) Otherwise parse (app + field parsing), comparing to the cached record in the same
        // pass and reusing it on an exact match.  We really want to reuse!
        const {processRawData, retainRaw} = this;
        let data = raw;
        if (processRawData) data = processRawData(raw);
        data = this.parseOrRescue(data, cached);

        if (!data) return cached;

        const ret = new StoreRecord({
            id,
            store: this,
            raw: retainRaw ? raw : null,
            data,
            committedData: data,
            parent,
            isSummary,
            digest,
            nonDefaultCount: this._recordBuildData.n
        });

        // Finalize summary only.  Non-summary finalized by RecordSet
        if (isSummary) ret.finalize();

        return ret;
    }

    // Committed record sharing an incoming raw's id and tree position - candidate for reuse
    private getCachedRecord(id: StoreRecordId, parent: StoreRecord): StoreRecord {
        const committed = this._committed;
        if (!committed || committed.empty) return null;
        const cached = committed.getById(id);
        return cached && this.positionUnchanged(cached.parent, parent) ? cached : null;
    }

    // True if a record cached under `cachedParent` sits at the same tree position under `parent`.
    // Memoize the last verified pair - siblings repeat it, and treePaths never change.
    private positionUnchanged(cachedParent: StoreRecord, parent: StoreRecord): boolean {
        if (this.idEncodesTreePath) return true;
        if (cachedParent === parent) return true;
        if (cachedParent === this._verifiedCachedParent && parent === this._verifiedNewParent) {
            return true;
        }
        if (!equal(cachedParent?.treePath, parent?.treePath)) return false;
        this._verifiedCachedParent = cachedParent;
        this._verifiedNewParent = parent;
        return true;
    }

    private createRecords(
        rawData: PlainObject[],
        parent: StoreRecord,
        recordMap: Map<StoreRecordId, StoreRecord> = new Map(),
        summaryRecordIds: Set<StoreRecordId> = this.summaryRecordIds
    ) {
        rawData.forEach(raw => this.createRecordDeep(raw, parent, recordMap, summaryRecordIds));
        return recordMap;
    }

    // Create a record - and recursively records for its tree children - installing all in recordMap.
    private createRecordDeep(
        raw: PlainObject,
        parent: StoreRecord,
        recordMap: Map<StoreRecordId, StoreRecord>,
        summaryRecordIds: Set<StoreRecordId> = this.summaryRecordIds
    ) {
        const rec = this.createRecord(raw, parent),
            {id} = rec;

        if (recordMap.has(id) || summaryRecordIds.has(id)) {
            throw XH.exception(
                `ID ${id} is not unique. Use the 'Store.idSpec' config to resolve a unique ID for each record.`
            );
        }

        recordMap.set(id, rec);

        if (this.loadTreeData && raw[this.loadTreeDataFrom]) {
            this.createRecords(raw[this.loadTreeDataFrom], rec, recordMap, summaryRecordIds);
        }
    }

    @computed({keepAlive: true})
    private get summaryRecordIds(): Set<StoreRecordId> {
        return new Set(this.summaryRecords?.map(it => it.id) ?? []);
    }

    /**
     * Parse a (pre-processed) raw object into record data, buffering each declared field's
     * parsed non-default value for buildData() in a single pass.
     *
     * Given a `cached` record, the pass also compares buffered values against its data,
     * returning null to direct the caller to reuse it - the "value rescue" that skips all
     * allocation for unchanged records. Soundness needs two checks beyond the deep-equal:
     * a matching cached value must itself be non-default (identity test vs the field default -
     * a deep match against an object/array default could mask another non-default cached
     * field), and non-default counts must agree (fields absent from the raw are never visited).
     */
    private parseOrRescue(data: PlainObject, cached: StoreRecord = null): PlainObject {
        const {_fieldMap, _recordBuildData} = this,
            {names, vals} = _recordBuildData,
            cachedData = cached?.data;
        let n = 0,
            rescuable = !!cached;
        for (const name in data) {
            const field = _fieldMap.get(name);
            // Calculated fields are never parsed or stored - values are computed at read time.
            if (field && !field.isCalculated) {
                const val = field.parseVal(data[name]);
                if (val !== field.defaultValue) {
                    if (rescuable) {
                        const cachedVal = cachedData[name];
                        rescuable = cachedVal !== field.defaultValue && equal(val, cachedVal);
                    }
                    names[n] = name;
                    vals[n] = val;
                    n++;
                }
            }
        }
        if (rescuable && n === cached.nonDefaultCount) return null;

        _recordBuildData.n = n;
        return this.buildData();
    }

    private parseUpdate(data: PlainObject, update: PlainObject): PlainObject {
        // Merge updated values over current ones, then rebuild exactly as parseOrRescue() would.
        const {_recordBuildData} = this,
            {names, vals} = _recordBuildData,
            hasOwn = Object.prototype.hasOwnProperty;
        let n = 0;
        this.fields.forEach(field => {
            const {name} = field;
            if (field.isCalculated) {
                throwIf(
                    hasOwn.call(update, name),
                    `Field '${name}' is calculated and read-only - its value is computed at read time and cannot be modified.`
                );
                return;
            }
            const val = hasOwn.call(update, name) ? field.parseVal(update[name]) : data[name];
            if (val !== field.defaultValue) {
                names[n] = name;
                vals[n] = val;
                n++;
            }
        });
        _recordBuildData.n = n;
        const ret = this.buildData();
        ret.id = data.id;
        return ret;
    }

    /**
     * Build a record `data` object from the non-default entries buffered in `_recordBuildData`,
     * choosing its representation by their count:
     *
     *  - Below `denseRecordThreshold`, a sparse object - own properties for the buffered values
     *    only, defaults reached through the shared `_dataDefaults` prototype. Costs nothing for
     *    unpopulated fields, and stays safely inside V8's fast-properties mode at these counts.
     *  - At or above it, a clone of the shared template carrying every Field. Wide objects built
     *    by per-property adds are demoted to V8's dictionary mode - cloning sidesteps the adds
     *    (overwriting an existing property is not an add), so all dense records share the
     *    template's one fixed shape. On stores with calculated fields the clone is instead an
     *    instance of the generated dense data class, whose prototype carries the calculated
     *    getters a plain spread-clone cannot see - constructor-assigned slots in one fixed order
     *    keep instances on a single shape, with V8's constructor slack tracking holding them in
     *    fast-properties mode well past the plain-object add limit.
     *
     * The representation is decided per record, from parsed content alone - records with equal
     * field values always take equal shapes, which the deep-equal comparisons in modifyRecords()
     * require.
     */
    private buildData(): PlainObject {
        const {names, vals, n} = this._recordBuildData,
            {_denseDataClass} = this,
            ret =
                n >= this._denseRecordThreshold
                    ? _denseDataClass
                        ? new _denseDataClass()
                        : {...this._dataTemplate}
                    : Object.create(this._dataDefaults);
        for (let i = 0; i < n; i++) {
            ret[names[i]] = vals[i];
        }
        return ret;
    }

    private throwIfProjectionOnly(op: string) {
        throwIf(
            this.projectionOnly,
            `Store.${op}() is not supported with 'projectionOnly' - this store is a read-only projection of data owned by its provider. Data updates flow in via loadData()/updateData().`
        );
    }

    /**
     * (Re)generate the per-Store constructs backing record `data` objects - field map, shared
     * defaults object and dense template, calculated field getters, and the generated projection
     * wrapper class. Deliberately a re-runnable function of Store state rather than a one-shot
     * constructor side effect, so a future API can update calculated field specs post-construction
     * and regenerate. Existing records are not re-wrapped - callers of a future regeneration API
     * own that step.
     */
    private generateDataConfig() {
        this._fieldMap = this.createFieldMap();

        // Cube-layer calculated fields (`CubeFieldSpec.calculatedFn`) are computed on View rows
        // with an AggregationContext - never evaluated by a Store holding such fields (e.g. a
        // Cube's internal leaf store), so they are excluded from the store-layer machinery here.
        this._calculatedFields = this.fields.filter(it => it.isCalculated && !it.isCubeField);
        this._hasCalculatedFields = !isEmpty(this._calculatedFields);
        this._equalityFields = this.fields.filter(it => !it.isCalculated);
        this._calculatedFieldNames = null;

        this._dataDefaults = this.createDataDefaults();
        // Clone for fast-props mode - before installing getters below, so the spread cannot
        // evaluate them against the defaults object.
        this._dataTemplate = {...this._dataDefaults};
        installCalculatedFieldGetters(this._dataDefaults, this._calculatedFields, () => this);

        this._denseDataClass = this.createDenseDataClass();
        this._projectionDataClass = this.createProjectionDataClass();
    }

    /**
     * Shared template for record `data` objects - an own property for every Field, holding its
     * defaultValue. `parseOrRescue()` clones it per record, so all records in a Store share one
     * identical, fixed shape. That keeps them in V8's compact fast-properties mode: objects built
     * instead by per-field property adds are demoted to a per-object hashtable ("dictionary mode")
     * past ~20 adds, costing several times more memory per record.
     *
     * Store-layer calculated fields hold no default slot - their values are read through
     * prototype getters installed on the returned object by `generateDataConfig()`.
     */
    private createDataDefaults() {
        const ret = {};
        this.fields.forEach(field => {
            if (field.isCalculated && !field.isCubeField) return;
            ret[field.name] = field.defaultValue;
        });
        return ret;
    }

    /**
     * Generated class for dense record data on stores declaring calculated fields - the
     * getter-carrying counterpart to the `_dataTemplate` spread-clone, which yields a plain
     * object that cannot see prototype getters. The constructor assigns a slot for `id` (written
     * post-construction by the StoreRecord constructor as an overwrite, never an add) and every
     * non-calculated Field at its defaultValue, in one fixed order - all instances share a
     * single shape, kept in V8's fast-properties mode by constructor slack tracking (the ~20-add
     * dictionary-mode demotion behind `denseRecordThreshold` applies to template-less plain
     * objects, not constructor-built instances). Calculated values read through prototype
     * getters. Null when not applicable, directing `buildData()` to the template clone.
     */
    private createDenseDataClass(): new () => PlainObject {
        if (!this._hasCalculatedFields) return null;

        const names = this._equalityFields.map(it => it.name),
            defaultValues = this._equalityFields.map(it => it.defaultValue);

        class DenseData {
            id: StoreRecordId = null;

            constructor() {
                for (let i = 0; i < names.length; i++) {
                    this[names[i]] = defaultValues[i];
                }
            }

            // Type-only, erased: field slots assigned by name above.
            [key: string]: any;
        }
        installCalculatedFieldGetters(DenseData.prototype, this._calculatedFields, () => this);
        return DenseData;
    }

    /**
     * Generated wrapper class for projection record data on stores declaring calculated fields.
     * Adopted raw objects cannot carry computed values, so each record's `data` becomes a
     * generated wrapper over the adopted raw (`data !== raw`) - source values read through
     * prototype getters over an own `_src` reference, calculated values via their calculatedFns.
     * Null when not applicable, directing `createRecord()` to adopt raw objects directly.
     */
    private createProjectionDataClass(): new (src: PlainObject) => PlainObject {
        if (!this.projectionOnly || !this._hasCalculatedFields) return null;

        class ProjectionData {
            // Own slots for every instance - `id` is written post-construction by the
            // StoreRecord constructor, an overwrite rather than a shape-changing add.
            id: StoreRecordId = null;
            _src: PlainObject;

            constructor(src: PlainObject) {
                this._src = src;
            }
        }
        installSourceFieldGetters(
            ProjectionData.prototype,
            this._equalityFields.map(it => it.name)
        );
        installCalculatedFieldGetters(ProjectionData.prototype, this._calculatedFields, () => this);
        return ProjectionData;
    }

    private createFieldMap() {
        const ret = new Map();
        this.fields.forEach(r => ret.set(r.name, r));
        return ret;
    }

    private createDigestFn(): (raw: PlainObject) => StoreRecordDigest {
        const {_digestSpec} = this;
        if (isFunction(_digestSpec)) return _digestSpec;
        if (isString(_digestSpec)) return raw => raw[_digestSpec];
        return null;
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

            // StoreRecordConfig requires data to be a "new object dedicated to this StoreRecord".
            const data = {...recToRevert.committedData};
            const ret = new StoreRecord({
                id: recToRevert.id,
                store: this,
                raw: recToRevert.raw,
                data,
                committedData: data,
                parent: null,
                isSummary: true
            });
            ret.finalize();
            return ret;
        });
    }
}

function isChildRawDataObject(obj): boolean {
    return obj.hasOwnProperty('rawData') && obj.hasOwnProperty('parentId');
}
