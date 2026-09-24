/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import type {GridFilterBindTarget} from '@xh/hoist/cmp/grid';
import {HoistBase, PlainObject, Some} from '@xh/hoist/core';
import {instanceManager} from '@xh/hoist/core/impl/InstanceManager';
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
import {ViewDiagnostics} from './impl/ViewDiagnostics';
import {action, observable, observableRef} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {castArray, forEach, groupBy, isEmpty, isNil, map} from 'lodash';
import {AggregationContext} from './aggregate/AggregationContext';
import {RowCache} from './impl/RowCache';
import {RowDataGenerator} from './impl/RowDataGenerator';
import {BaseRow} from './row/BaseRow';
import {ExposedLeafRow, HiddenLeafRow, LeafRow, LeafUpdateChanges} from './row/LeafRow';
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

    /** See {@link HoistBase.xhName}. */
    xhName?: string;
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
 * Changes to a View's leaves derived from a cube delta - see `View.getLeafDelta`.
 */
interface LeafDelta {
    /** Records of leaves already in the view whose data changed. */
    update: StoreRecord[];
    /** Records entering the view - newly added to the cube, or now passing its filter. */
    add: StoreRecord[];
    /** Leaves leaving the view - their records removed from the cube, or no longer passing. */
    remove: LeafRow[];
    /** Queried fields to diff on updated leaves - see {@link RecordSetDelta.changedFields}. */
    checkFields: CubeField[];
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
    @observableRef accessor query: Query = null;

    /**
     * Results of this view, an observable object with a `rows` property containing an array of
     * hierarchical {@link ViewRowData} objects.
     */
    @observableRef accessor result: ViewResult = null;

    /** Stores to which results of this view should be (re)loaded. */
    stores: Store[] = null;

    /** The source {@link Cube.info} as of the last time the view was updated. */
    @observableRef accessor info: PlainObject = null;

    /** The source {@link Cube.lastUpdated} as of the last time the view was updated. */
    @observable accessor cubeUpdated: number;

    /** Timestamp (ms) when the view was last updated. */
    @observable accessor lastUpdated: number;

    /** @internal */
    readonly diagnostics = new ViewDiagnostics(this);

    _created = Date.now();

    // Implementation
    private _rowDatas: ViewRowData[] = null;
    private _leafMap: Map<StoreRecordId, LeafRow> = null;
    private _rootRow: AggregateRow = null; // grand total row, when the query sets includeRoot
    _records: RecordSet = null; // cube records passing this view's filter
    private _bucketDependentFields = new Set<string>();

    private _fieldsByName: Map<string, CubeField> = null;
    private _rowDataGenerator: RowDataGenerator = null;
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

        const start = performance.now(),
            {query, stores = [], connect = false, xhName = null} = config;

        this.xhName = xhName;
        this.query = query;
        this.stores = this.parseStores(stores);
        this._rowCache = new RowCache(this);
        this._rowDataGenerator = new RowDataGenerator(this);
        this.buildIndices();
        this.fullUpdate('query', start);

        if (connect) {
            this.cube._connectedViews.add(this);
        }

        instanceManager.registerView(this);
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
        const start = performance.now(),
            oldQuery = this.query,
            newQuery = oldQuery.clone(overrides);

        if (oldQuery.equals(newQuery)) return;

        this.query = newQuery;
        this._rowDataGenerator.onQueryChange();
        this.buildIndices();

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

        this.fullUpdate('query', start);
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
        return this._fieldsByName.get(name);
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
        this.fullUpdate('load', performance.now());
    }

    @action
    noteCubeUpdated(changes: RecordSetDelta) {
        const start = performance.now(),
            delta = this.getLeafDelta(changes);

        if (!delta) {
            this.fullUpdate('update', start);
        } else if (!isEmpty(delta.add) || !isEmpty(delta.remove)) {
            this.leafPopulationUpdate(delta, start);
        } else if (!isEmpty(delta.update)) {
            this.dataOnlyUpdate(delta, start);
        } else {
            this.dataUnchangedUpdate(start);
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
     * Create a new aggregate or bucket row data object.
     * @internal
     */
    newParentRowData(id: string): ViewRowData {
        const ret = this._rowDataGenerator.newParentRowData(id);
        this.assignDigest(ret);
        return ret;
    }

    /**
     * Create the data object for an exposed leaf row.
     * @internal
     */
    newLeafRowData(id: string, src: PlainObject): ViewRowData {
        const ret = this._rowDataGenerator.newLeafRowData(id, src);
        this.assignDigest(ret);
        return ret;
    }

    assignDigest(data: ViewRowData) {
        data.cubeRowDigest = ++this._rowDigest;
    }

    private buildIndices() {
        this._fieldsByName = new Map(this.fields.map(it => [it.name, it]));

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

    private fullUpdate(trigger: 'load' | 'update' | 'query', start: number) {
        this.filterRecords();
        this.createAggregationContext();
        this.generateRows();
        this.loadStores();
        this.updateResults();

        const {diagnostics} = this;
        switch (trigger) {
            case 'query':
                diagnostics.noteQuery('fullUpdate', start);
                break;
            case 'load':
                diagnostics.noteLoad('fullUpdate', start);
                break;
            case 'update':
                diagnostics.noteUpdate('fullUpdate', start);
                break;
        }
    }

    // Apply value changes to leaves already in the view, adjusting ancestor aggregates in place.
    private dataOnlyUpdate(delta: LeafDelta, start: number) {
        const {_leafMap, stores} = this,
            {update, checkFields} = delta,
            changed: LeafUpdateChanges = {rows: new Set(), fields: new Set()};

        // `_records` left stale by design - simple updates never touch filter/dim/bucket fields.
        update.forEach(rec => {
            _leafMap.get(rec.id).applyLeafDataUpdate(rec, checkFields, changed);
        });

        changed.rows.forEach(rowData => this.assignDigest(rowData));

        this.createAggregationContext();

        stores.forEach(store => {
            const recordUpdates = [];
            changed.rows.forEach(rowData => {
                if (store.getById(rowData.id)) recordUpdates.push(rowData);
            });
            store.updateData({update: recordUpdates, changedFields: changed.fields});
        });
        this.updateResults();
        this.diagnostics.noteUpdate('dataOnly', start);
    }

    // Add and remove leaves in place, alongside any value changes. Applies to leaves-only views,
    // where entering and leaving leaves change no grouping - the root, if any, simply re-aggregates
    // over its new children. Compare `fullUpdate`, which re-filters and regenerates everything.
    private leafPopulationUpdate(delta: LeafDelta, start: number) {
        const {_leafMap, _rowCache, _rootRow, query, stores} = this,
            {update, add, remove, checkFields} = delta,
            changed: LeafUpdateChanges = {rows: new Set(), fields: new Set()},
            wasEmpty = _leafMap.size === 0;

        // `_records` left stale by design, as for dataOnlyUpdate - a leaves-only view never reads
        // it between full updates.
        this.createAggregationContext();

        // 1) Leaving leaves drop out of the cache as well - their records are gone or replaced, so
        // they can never be reused.
        const leaving = new Set<BaseRow>(remove);
        remove.forEach(leaf => {
            _leafMap.delete(leaf.cubeRecordId);
            _rowCache.remove(leaf.id);
            leaf.parent = null;
        });

        // 2) Updated leaves adopt their new data without propagating - the root re-aggregates
        // from scratch below regardless.
        update.forEach(rec => {
            _leafMap.get(rec.id).applyLeafDataUpdate(rec, checkFields, changed, false);
        });

        // 3) Entering leaves are always minted anew - a record enters via a new instance, which no
        // cached leaf can match.
        const entering = add.map(rec => {
            const leaf = this.newLeafRow(rec);
            _leafMap.set(rec.id, leaf);
            _rowCache.add(leaf);
            return leaf;
        });

        changed.rows.forEach(rowData => this.assignDigest(rowData));

        // 4) Rewire and re-aggregate the root over its new children, then republish rows via the
        // same visibility logic as a full generation.
        if (_rootRow) {
            const children = [..._rootRow.children.filter(it => !leaving.has(it)), ...entering],
                prevDigest = _rootRow.data.cubeRowDigest;
            _rootRow.reuse(children, this._rowDigest);
            if (_rootRow.data.cubeRowDigest !== prevDigest) changed.rows.add(_rootRow.data);
            this._rowDatas = [_rootRow].flatMap(it => it.getVisibleDatas());
        } else {
            this._rowDatas = query.includeLeaves
                ? Array.from(_leafMap.values(), it => it.data as ViewRowData)
                : [];
        }

        // 5) Sync connected stores. Reload outright where leaf placement within the store is not
        // static: a root emptied or newly populated is skipped or restored wholesale (see
        // loadStores), and lock/omit hooks decide per generation whether leaves appear at all.
        if (_rootRow && (wasEmpty || _leafMap.size === 0 || query.lockFn || query.omitFn)) {
            this.loadStores();
        } else {
            const leafDatas = query.includeLeaves ? entering.map(it => it.data as ViewRowData) : [],
                leafIds = query.includeLeaves ? remove.map(it => it.id) : [];
            stores.forEach(store => {
                // Leaves load as children of the root, unless the store adopts it as its summary.
                const parentId = _rootRow && !store.loadRootAsSummary ? _rootRow.id : null,
                    recordUpdates = [];
                changed.rows.forEach(rowData => {
                    if (store.getById(rowData.id)) recordUpdates.push(rowData);
                });
                store.updateData({
                    update: recordUpdates,
                    add: parentId ? leafDatas.map(rawData => ({rawData, parentId})) : leafDatas,
                    remove: leafIds.filter(id => store.getById(id))
                });
            });
        }

        this.updateResults();
        this.diagnostics.noteUpdate('leafPopulation', start, {
            reused: _leafMap.size - entering.length + (_rootRow ? 1 : 0),
            rebuilt: 0,
            created: entering.length
        });
    }

    // Rows left untouched, but deciding that meant testing the changes against the query.
    private dataUnchangedUpdate(start: number) {
        this.info = this.cube.info;
        this.cubeUpdated = this.cube.lastUpdated;
        this.diagnostics.noteUpdate('unchanged', start);
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

        this._rootRow = null;
        if (includeRoot) {
            const root = rowCache.getOrCreate(
                rootId,
                newRows,
                () => new AggregateRow(this, rootId, newRows, null, 'Total', {}, 0)
            );
            this._rootRow = root;
            newRows = [root];
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
            return records.map(r => {
                // Leaves are keyed by stable record id, supporting reuse across grouping changes.
                const leaf = this._rowCache.getOrCreate(
                    r.id.toString(),
                    null,
                    () => this.newLeafRow(r),
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

    // Derive the changes to this view's leaves from a cube delta - false if they cannot be applied
    // in place: aggregations are complex, dimension or bucket values moved, or leaves would enter
    // or leave a view with grouped rows (see `supportsIncrementalLeafChanges`).
    private getLeafDelta(t: RecordSetDelta): LeafDelta | false {
        if (!t) return {update: [], add: [], remove: [], checkFields: []};
        if (!this.aggregatorsAreSimple) return false;

        const {_leafMap, query} = this,
            update: StoreRecord[] = [],
            add: StoreRecord[] = [],
            remove: LeafRow[] = [];

        // Removed records leave and added records enter, if they pass any filter...
        t.remove?.forEach(rec => {
            const leaf = _leafMap.get(rec.id);
            if (leaf) remove.push(leaf);
        });
        t.add?.forEach(rec => {
            if (query.test(rec)) add.push(rec);
        });

        // ...while updated records already present that still pass are data-only changes. Any
        // other combination crosses the filter boundary, entering or leaving.
        t.update?.forEach(rec => {
            const passes = query.test(rec),
                leaf = _leafMap.get(rec.id);
            if (passes && leaf) {
                update.push(rec);
            } else if (passes) {
                add.push(rec);
            } else if (leaf) {
                remove.push(leaf);
            }
        });

        if ((add.length || remove.length) && !this.supportsIncrementalLeafChanges) return false;
        if (this.hasDimOrBucketUpdates(update)) return false;

        // A producer supplying changedFields asserts no field outside the set moved.
        const {changedFields} = t,
            checkFields = changedFields
                ? this.fields.filter(it => changedFields.has(it.name))
                : this.fields;
        return {update, add, remove, checkFields};
    }

    // Changes to dimension or bucket field values on leaves already in the view would require
    // rebuilding the row hierarchy.
    private hasDimOrBucketUpdates(update: StoreRecord[]): boolean {
        const {dimensions} = this.query,
            bucketFields = this._bucketDependentFields;

        if (isEmpty(dimensions) && !bucketFields.size) return false;

        for (const rec of update) {
            const curData = this._leafMap.get(rec.id).cubeRecord.data,
                {data} = rec;
            for (const dim of dimensions) {
                if (data[dim.name] !== curData[dim.name]) return true;
            }
            for (const name of bucketFields) {
                if (data[name] !== curData[name]) return true;
            }
        }

        return false;
    }

    /**
     * True if leaves can enter and leave this view without regenerating its rows - i.e. it groups
     * by no dimensions and buckets no leaves, so its only possible parent is a root total.
     * @internal
     */
    get supportsIncrementalLeafChanges(): boolean {
        const {dimensions, bucketSpecFn, includeLeaves} = this.query;
        return isEmpty(dimensions) && !(bucketSpecFn && includeLeaves);
    }

    private newLeafRow(rec: StoreRecord): LeafRow {
        const id = rec.id.toString();
        return this.exposesLeaves
            ? new ExposedLeafRow(this, id, rec)
            : new HiddenLeafRow(this, id, rec);
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
            ret.some(s => s.digestSpec != null && s.digestSpec !== 'cubeRowDigest'),
            '`Store.digestSpec` cannot be configured on a Store connected to a Cube View - the View manages record reuse automatically, installing its own row-based digest. Leave unset.'
        );
        ret.forEach(s => (s.digestSpec = 'cubeRowDigest'));

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
        instanceManager.unregisterView(this);
        this.disconnect();
        super.destroy();
    }
}
