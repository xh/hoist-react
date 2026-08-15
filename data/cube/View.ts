/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import type {GridFilterBindTarget} from '@xh/hoist/cmp/grid';
import {HoistBase, PlainObject, Some} from '@xh/hoist/core';
import {
    Cube,
    CubeField,
    Filter,
    FilterBindTarget,
    FilterLike,
    FilterValueSource,
    Query,
    QueryConfig,
    Store,
    StoreRecord,
    StoreRecordId
} from '@xh/hoist/data';
import {ViewRowData} from '@xh/hoist/data/cube/ViewRowData';
import {ViewDiagnostics, ViewOpType} from './ViewDiagnostics';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {castArray, find, forEach, groupBy, isEmpty, isNil, isString, map, uniq} from 'lodash';
import {AggregationContext} from './aggregate/AggregationContext';
import {RowCache} from './impl/RowCache';
import {BaseRow} from './row/BaseRow';
import {ExposedLeafRow, HiddenLeafRow, LeafRow} from './row/LeafRow';
import {AggregateRow, BucketRow} from './row/ParentRow';
import {RecordSet, RecordSetDelta} from '../impl/RecordSet';

/**
 * Configuration for a {@link View} - a query result from a {@link Cube} that can optionally
 * stay connected for live updates. Create via {@link Cube.createView}.
 *
 * See the Cube package README (`data/cube/README.md`) for query patterns.
 *
 * @see View
 * @see QueryConfig
 */
export interface ViewConfig {
    /** Query to be used to construct this view. */
    query: Query;

    /**
     * Store(s) to be automatically (re)loaded with data from this view.
     * Optional - read {@link View.result} directly to use without a Store.
     *
     * Connected stores should generally set {@link StoreConfig.projectionOnly} - view rows are
     * already parsed and owned by this View, so adopting them directly improves performance
     * when no additional record parsing or local data modification is required.
     */
    stores?: Store[] | Store;

    /**
     * True to reactively update the View's {@link View.result} and any connected store(s) when data
     * in the underlying Cube changes. False (default) to have this view run its query once to
     * capture a snapshot without further (automatic) updates.
     */
    connect?: boolean;
}

export interface ViewResult {
    rows: ViewRowData[];

    /**
     * Leaf-level rows, keyed by the id of their source Cube record.
     *
     * Null unless the Query sets {@link Query.includeLeaves} or {@link Query.provideLeaves} - views
     * that expose no leaves keep them as zero-copy references to Cube record data, which is not
     * safe to publish. Use {@link Cube.store} to read source records directly in that case.
     */
    leafMap: Map<StoreRecordId, ExposedLeafRow>;
}

export interface DimensionValue {
    /** Dimension field. */
    field: CubeField;

    /** Unique non-null values for the dimension */
    values: Set<any>;
}

/**
 * Primary interface for consuming grouped and aggregated data from a {@link Cube}.
 * Created via {@link Cube.createView} with a {@link QueryConfig} and optional connected
 * stores. Views can be transient (run once) or connected for auto-updating results.
 *
 * Use `updateQuery()` to change dimensions, filters, or options dynamically.
 *
 * See the Cube package README (`data/cube/README.md`) for query patterns and examples
 * of grand totals, leaf drill-down, and store integration.
 *
 * @see ViewConfig
 * @see QueryConfig
 * @see Cube
 *
 * @mcpHint live or snapshot view of aggregated Cube data
 */
export class View
    extends HoistBase
    implements FilterBindTarget, FilterValueSource, GridFilterBindTarget
{
    static isView(obj: unknown): obj is View {
        return obj instanceof View;
    }

    readonly isFilterValueSource = true;

    /** Query defining this View. Update via {@link updateQuery}. */
    @observable.ref
    query: Query = null;

    /**
     * Results of this view, an observable object with a `rows` property containing an array of
     * hierarchical {@link ViewRowData} objects.
     */
    @observable.ref
    result: ViewResult = null;

    /** Stores to which results of this view should be (re)loaded. */
    stores: Store[] = null;

    /** The source {@link Cube.info} as of the last time the view was updated. */
    @observable.ref
    info: PlainObject = null;

    /** The source {@link Cube.lastUpdated} as of the last time the view was updated. */
    @observable
    cubeUpdated: number;

    /** Timestamp (ms) when the view was last updated. */
    @observable
    lastUpdated: number;

    /**
     * Detail on the last row generation performed by this View, for performance debugging and
     * developer tooling. Not a stable API - see {@link ViewDiagnostics}.
     */
    readonly diagnostics = new ViewDiagnostics();

    // Implementation
    private _rowDatas: ViewRowData[] = null;
    private _leafMap: Map<StoreRecordId, LeafRow> = null;
    _records: RecordSet = null; // cube records passing this view's filter
    private _bucketDependentFields = new Set<string>();
    private _rowDataTemplate: ViewRowData = null;
    // Monotonic source for cubeRowDigest stamps - safe-integer headroom spans centuries of use.
    _rowDigest = 0;
    // Fields eligible for aggregation at each level of the query - i.e. those with an aggregator
    // that are not themselves an applied dimension there - and useful subsets of same. Indexed by
    // row depth, with entry 0 (no dimensions applied) holding the superset for the whole query.
    _aggFieldsByDepth: CubeField[][] = null;
    _aggFieldNamesByDepth: Set<string>[] = null;
    _canAggregateFnFieldsByDepth: CubeField[][] = null;
    _complexAggFieldsByDepth: CubeField[][] = null;
    _aggContext: AggregationContext = null;
    _rowCache: RowCache = null;

    /** @internal - applications should use {@link Cube.createView} */
    constructor(config: ViewConfig) {
        super();
        makeObservable(this);

        const {query, stores = [], connect = false} = config;

        this.query = query;
        this.stores = this.parseStores(stores);
        this._rowCache = new RowCache(this);
        this.buildRowTemplates();
        this.fullUpdate('queryChanged');

        if (connect) {
            this.cube._connectedViews.add(this);
        }
    }

    //--------------------
    // Main Public API
    //--------------------
    get cube(): Cube {
        return this.query.cube;
    }

    get fields(): CubeField[] {
        return this.query.fields;
    }

    get fieldNames(): string[] {
        return map(this.fields, 'name');
    }

    get filter(): Filter {
        return this.query.filter;
    }

    get isConnected(): boolean {
        return this.cube.viewIsConnected(this);
    }

    get isFiltered(): boolean {
        return !isEmpty(this.query.filter);
    }

    /** Stop receiving live updates into this view when the linked Cube data changes. */
    disconnect() {
        this.cube.disconnectView(this);
    }

    /** Connect to the associated Cube to begin receiving live updates. */
    @action
    connect() {
        this.cube.connectView(this);
    }

    /**
     * Change the query in some way, re-computing the data in this View to reflect the new query.
     *
     * @param overrides - changes to be applied to the query. If changing the `cube` and currently
     *      connected, then we will disconnect from the old cube and connect to the new one.
     */
    @action
    updateQuery(overrides: Partial<QueryConfig>) {
        const oldQuery = this.query,
            newQuery = oldQuery.clone(overrides);

        if (oldQuery.equals(newQuery)) return;

        this.query = newQuery;
        this.buildRowTemplates();

        // If the cube is changing potentially disconnect from the old cube and connect to the new
        const {cube: oldCube} = oldQuery,
            {cube: newCube} = newQuery;

        if (oldCube !== newCube) {
            this.info = null;
            this.cubeUpdated = null;
            this._rowCache.clear();

            if (oldCube.viewIsConnected(this)) {
                oldCube.disconnectView(this);
                newCube.connectView(this);
                return; // Connecting triggers a full update so we early out
            }
        }

        this.fullUpdate('queryChanged');
    }

    /** Gather all unique values for each dimension field in the query. */
    getDimensionValues(): DimensionValue[] {
        const ret = this.query.fields
            .filter(it => it.isDimension)
            .map(field => ({field, values: new Set<any>()}));

        this._leafMap.forEach(leaf => {
            const {data} = leaf.cubeRecord;
            ret.forEach(({field, values}) => values.add(data[field.name]));
        });

        return ret;
    }

    /** Get a specific Field by name.*/
    getField(name: string): CubeField {
        return find(this.fields, {name});
    }

    /** Set stores to be loaded/reloaded with data from this view. */
    setStores(stores: Some<Store>) {
        this.stores = this.parseStores(stores);
        this.loadStores();
    }

    /** Update the filter on the current Query.*/
    setFilter(filter: FilterLike) {
        this.updateQuery({filter});
    }

    //-----------------------
    // Entry point for cube
    //-----------------------
    @action
    noteCubeLoaded() {
        this.fullUpdate('cubeLoaded');
    }

    @action
    noteCubeUpdated(changes: RecordSetDelta) {
        const simpleUpdates = this.getSimpleUpdates(changes);

        if (isString(simpleUpdates)) {
            this.fullUpdate(simpleUpdates);
        } else if (!isEmpty(simpleUpdates)) {
            this.dataOnlyUpdate(simpleUpdates);
        } else {
            this.info = this.cube.info;
            this.cubeUpdated = this.cube.lastUpdated;
        }
    }

    //----------------------------
    // FilterValueSource interface
    //----------------------------
    getValuesForFieldFilter(fieldName: string, filter?: Filter): any[] {
        return this.cube.store.getValuesForFieldFilter(fieldName, filter);
    }

    //------------------------
    // Implementation
    //------------------------
    /**
     * True if leaf rows are exposed on results - i.e. Query sets includeLeaves or provideLeaves.
     * @internal
     */
    get exposesLeaves(): boolean {
        const {includeLeaves, provideLeaves} = this.query;
        return includeLeaves || provideLeaves;
    }

    /**
     * Create a new row data object as a clone of this View's shared template, which carries a
     * slot for every ViewRowData property and query field. Rows are only ever written via
     * overwrites of these slots - never property adds - so rows minted for a given query share
     * one fixed shape, keeping them in V8's compact fast-properties mode rather than
     * "dictionary mode".
     * @internal
     */
    newRowData(id: string): ViewRowData {
        return {...this._rowDataTemplate, id, cubeRowDigest: ++this._rowDigest};
    }

    noteRowDataMutated(data: PlainObject) {
        data.cubeRowDigest = ++this._rowDigest;
    }

    // Templates depend on the query's field set - rebuilt on any query change.
    private buildRowTemplates() {
        const rowData: PlainObject = {
            id: null,
            cubeRowType: null,
            cubeLabel: null,
            cubeDimension: null,
            cubeBuckets: null,
            children: null,
            isCubeLeaf: false,
            cubeRowDigest: null,
            _cubeLeafChildren: null
        };
        this.fields.forEach(({name}) => (rowData[name] = null));

        // Convert into V8 fast-properties mode that we'll need to mint additional fast objects
        this._rowDataTemplate = {...rowData} as ViewRowData;

        // Aggregation eligibility is a function of level alone - dimensions apply in order, and
        // bucket rows share the level of the aggregate row above them. Note depth 0 has no applied
        // dimensions, and so holds the unfiltered superset of each list. Queries need not specify
        // dimensions at all (e.g. a leaves-only or root-total-only query) - Query.dimensions is
        // null in that case, leaving only the depth-0 entry below.
        const dimensions = this.query.dimensions ?? [],
            aggFields = this.fields.filter(it => it.aggregator),
            appliedDimNames = dimensions.map(
                (v, idx) => new Set(dimensions.slice(0, idx + 1).map(it => it.name))
            );
        appliedDimNames.unshift(new Set());

        this._aggFieldsByDepth = appliedDimNames.map(names =>
            aggFields.filter(it => !names.has(it.name))
        );
        this._aggFieldNamesByDepth = this._aggFieldsByDepth.map(
            fields => new Set(fields.map(it => it.name))
        );
        this._canAggregateFnFieldsByDepth = this._aggFieldsByDepth.map(fields =>
            fields.filter(it => it.canAggregateFn)
        );
        this._complexAggFieldsByDepth = this._aggFieldsByDepth.map(fields =>
            fields.filter(it => !it.aggregator.dependsOnChildrenOnly)
        );
    }

    private fullUpdate(type: ViewOpType) {
        this.withDebug(['fullUpdate', `${this.cube.store.allCount} cube rows`], () => {
            this.filterRecords();
            this.createAggregationContext();
            this.generateRows();
            this.loadStores();
            this.updateResults();
            this.noteOp(type);
        });
    }

    private dataOnlyUpdate(updates: StoreRecord[]) {
        this.withDebug(['dataOnlyUpdate', `${updates.length} updates`], () => {
            const {_leafMap, stores} = this,
                updatedRowDatas = new Set<PlainObject>();

            // `_records` left stale by design - simple updates never touch filter/dim/bucket fields.
            updates.forEach(rec => {
                const leaf = _leafMap.get(rec.id);
                leaf?.applyLeafDataUpdate(rec, updatedRowDatas);
            });

            updatedRowDatas.forEach(rowData => this.noteRowDataMutated(rowData));

            this.createAggregationContext();

            stores.forEach(store => {
                const recordUpdates = [];
                updatedRowDatas.forEach(rowData => {
                    if (store.getById(rowData.id)) recordUpdates.push(rowData);
                });
                store.updateData({update: recordUpdates});
            });
            this.updateResults();
            this.noteOp('dataOnly');
        });
    }

    // Record the generation just completed against the diagnostics slot for its trigger - a
    // regeneration driven by a query change or a Cube load is reported separately from the
    // steady-state response to Cube data changes, so neither masks the other.
    private noteOp(type: ViewOpType) {
        // Row counts come from the last generation - on a data-only update no generation ran, so
        // the row set is unchanged and every row was, in effect, reused.
        const counts = this._rowCache.generationCounts,
            total = counts.reused + counts.rebuilt + counts.created,
            op = {
                type,
                ...(type === 'dataOnly' ? {reused: total, rebuilt: 0, created: 0} : counts),
                total,
                timestamp: Date.now()
            };
        if (type === 'queryChanged') {
            this.diagnostics.noteQuery(op);
        } else if (type === 'cubeLoaded') {
            this.diagnostics.noteLoad(op);
        } else {
            this.diagnostics.noteUpdate(op);
        }
    }

    private loadStores() {
        const {_leafMap, _rowDatas} = this;
        if (!_leafMap || !_rowDatas) return;

        // Skip degenerate root in stores/grids, but preserve in object api.
        const storeRows = _leafMap.size !== 0 ? _rowDatas : [];
        this.stores.forEach(s => s.loadData(storeRows));
    }

    private updateResults() {
        const {_leafMap, _rowDatas} = this;
        this.result = {
            rows: _rowDatas,
            // Hidden leaves adopt Cube record data outright - never publish them.
            leafMap: this.exposesLeaves ? (_leafMap as Map<StoreRecordId, ExposedLeafRow>) : null
        };
        this.info = this.cube.info;
        this.cubeUpdated = this.cube.lastUpdated;
        this.lastUpdated = Date.now();
    }

    // Generate a new full data representation from the filtered records
    private generateRows() {
        const {query} = this,
            {dimensions, includeRoot} = query,
            rootId = 'root';

        this._bucketDependentFields.clear();

        const rowCache = this._rowCache;
        rowCache.beginGeneration();

        const leafMap: Map<StoreRecordId, LeafRow> = new Map();
        let newRows = this.groupAndInsertRecords(
            this._records.list,
            dimensions,
            rootId,
            {},
            0,
            leafMap
        );
        newRows = this.bucketRows(newRows, rootId, {}, 0);

        if (includeRoot) {
            newRows = [
                rowCache.getOrCreate(
                    rootId,
                    newRows,
                    () => new AggregateRow(this, rootId, newRows, null, 'Total', {}, 0)
                )
            ];
        } else if (!query.includeLeaves && newRows[0]?.isLeaf) {
            newRows = []; // degenerate case, no visible rows
        }

        this._leafMap = leafMap;

        if (query.bucketSpecFn) newRows.forEach(row => row.syncBuckets(null));

        // This is the magic. We only actually reveal to API the network of *data* nodes.
        // This hides all the meta information, as well as unwanted leaves and skipped rows.
        // Underlying network still there and updates will flow up through it via the leaves.
        this._rowDatas = newRows.flatMap(it => it.getVisibleDatas());

        rowCache.endGeneration();
    }

    private groupAndInsertRecords(
        records: StoreRecord[],
        dimensions: CubeField[],
        parentId: string,
        appliedDimensions: PlainObject,
        depth: number,
        leafMap: Map<StoreRecordId, LeafRow>
    ): BaseRow[] {
        if (!records?.length) return [];

        // `depth` counts the dimensions applied so far - the next to apply is dimensions[depth].
        if (!dimensions || depth === dimensions.length) {
            const {exposesLeaves} = this;
            return records.map(r => {
                // Leaves are keyed by stable record id, supporting reuse across grouping changes.
                const id = r.id.toString(),
                    leaf = this._rowCache.getOrCreate(
                        id,
                        null,
                        () =>
                            exposesLeaves
                                ? new ExposedLeafRow(this, id, r)
                                : new HiddenLeafRow(this, id, r),
                        r
                    );
                leafMap.set(r.id, leaf);
                return leaf;
            });
        }

        const rootId = parentId + Cube.RECORD_ID_DELIMITER,
            dim = dimensions[depth],
            dimName = dim.name,
            groups = groupBy(records, it => it.data[dimName]);

        // Bucket rows share the level of the aggregate row above them - see `_appliedDimNames`.
        // Note this object is mutated as we move across groups - rows must clone to retain it.
        const groupDepth = depth + 1,
            groupDimensions = {...appliedDimensions};
        return map(groups, (groupRecords, strVal) => {
            const id = rootId + `${dimName}=[${strVal}]`;
            groupDimensions[dimName] = groupRecords[0].data[dimName];

            let children = this.groupAndInsertRecords(
                groupRecords,
                dimensions,
                id,
                groupDimensions,
                groupDepth,
                leafMap
            );
            children = this.bucketRows(children, id, groupDimensions, groupDepth);

            return this._rowCache.getOrCreate(
                id,
                children,
                () => new AggregateRow(this, id, children, dim, strVal, groupDimensions, groupDepth)
            );
        });
    }

    private bucketRows(
        rows: BaseRow[],
        parentId: string,
        appliedDimensions: PlainObject,
        depth: number
    ): BaseRow[] {
        const {query} = this;

        if (!query.bucketSpecFn) return rows;
        if (!query.includeLeaves && rows[0]?.isLeaf) return rows;

        const bucketSpec = query.bucketSpecFn(rows);
        if (!bucketSpec) return rows;

        const {name: bucketName, bucketFn, dependentFields} = bucketSpec,
            buckets: Record<string, BaseRow[]> = {},
            ret: BaseRow[] = [];

        dependentFields.forEach(it => this._bucketDependentFields.add(it));

        // Determine which bucket to put this row into (if any)
        rows.forEach(row => {
            const bucketVal = bucketFn(row);
            if (isNil(bucketVal)) {
                ret.push(row);
            } else {
                const bucketRows = (buckets[bucketVal] ??= []);
                bucketRows.push(row);
            }
        });

        // Create new rows for each bucket and add to the result
        forEach(buckets, (rows, bucketVal) => {
            const id = parentId + Cube.RECORD_ID_DELIMITER + `${bucketName}=[${bucketVal}]`;
            const bucket = this._rowCache.getOrCreate(
                id,
                rows,
                () => new BucketRow(this, id, rows, bucketVal, bucketSpec, appliedDimensions, depth)
            );
            ret.push(bucket);
        });

        return ret;
    }

    // Return a list of simple data updates we can apply to leaves, or the ViewOpType naming the
    // condition that requires a full regeneration instead.
    private getSimpleUpdates(t: RecordSetDelta): StoreRecord[] | ViewOpType {
        if (!t) return [];
        if (!this.aggregatorsAreSimple) return 'complexAggregators';
        const {_leafMap, query} = this;

        // 1) Simple case: no filter
        if (!query.filter) {
            if (!isEmpty(t.add) || !isEmpty(t.remove)) return 'leafSetChanged';
            return this.hasDimOrBucketUpdates(t.update) ? 'dimensionChanged' : t.update;
        }

        // 2) Examine, accounting for filter
        // 2a) Relevant adds or removes fail us
        if (t.add?.some(rec => query.test(rec))) return 'leafSetChanged';
        if (t.remove?.some(rec => _leafMap.has(rec.id))) return 'leafSetChanged';

        // 2b) Examine updates, if they change w.r.t. filter then fail otherwise take relevant
        const ret = [];
        if (t.update) {
            for (const r of t.update) {
                const passes = query.test(r),
                    present = _leafMap.has(r.id);

                if (passes !== present) return 'filterCrossed';
                if (present) ret.push(r);
            }
        }

        // 2c) Examine the final set of updates for any changes to dimension field values which would
        //     require rebuilding the row hierarchy
        if (this.hasDimOrBucketUpdates(ret)) return 'dimensionChanged';

        return ret;
    }

    private hasDimOrBucketUpdates(update: StoreRecord[]): boolean {
        const {dimensions} = this.query,
            bucketDependentFields = Array.from(this._bucketDependentFields);

        if (isEmpty(dimensions) && isEmpty(bucketDependentFields)) return false;

        const fieldNames = uniq([...dimensions.map(it => it.name), ...bucketDependentFields]);
        for (const rec of update) {
            const curRec = this._records.getById(rec.id);
            if (fieldNames.some(name => rec.data[name] !== curRec.data[name])) return true;
        }

        return false;
    }

    private filterRecords() {
        const {query, cube} = this;
        this._records = cube.store._filtered.withFilter(query.filter, this._records);
    }

    private createAggregationContext() {
        this._aggContext = new AggregationContext(this);
    }

    /**
     * True if all aggregators depend only on child rows, allowing aggregate/bucket row reuse
     * and incremental data-only updates - see {@link Aggregator.dependsOnChildrenOnly}.
     * @internal
     */
    get aggregatorsAreSimple() {
        return isEmpty(this._complexAggFieldsByDepth[0]);
    }

    /**
     * True if reused parent rows must re-derive context-reading fields - complex aggregators and
     * `canAggregateFn` results - on every generation, as either may move with the
     * per-generation AggregationContext. See {@link ParentRow.reuse}.
     * @internal
     */
    get hasContextDependentFields(): boolean {
        return !this.aggregatorsAreSimple || !isEmpty(this._canAggregateFnFieldsByDepth[0]);
    }

    private parseStores(stores: Some<Store>): Store[] {
        const ret = castArray(stores);

        throwIf(
            ret.some(s => s.reuseRecords != null),
            '`Store.reuseRecords` cannot be configured on a Store connected to a Cube View - the View manages record reuse automatically, installing its own row-based digest. Leave unset.'
        );
        ret.forEach(s => s.setDigestFn(row => row.cubeRowDigest));

        throwIf(
            ret.some(s => s.idEncodesTreePath),
            '`Store.idEncodesTreePath` cannot be configured on a Store connected to a Cube View - view row ids do not encode a fixed tree position. Leave unset.'
        );

        if (ret.some(s => s.projectionOnly == null && !s.processRawData)) {
            this.logWarn(
                'Connected store(s) do not set `projectionOnly` - recommended for improved performance when no additional record parsing or local data modification is required. Set explicitly to false to opt out and silence this warning.'
            );
        }

        return ret;
    }

    override destroy() {
        this.disconnect();
        super.destroy();
    }
}
