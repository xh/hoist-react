/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

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
    StoreChangeLog,
    StoreRecord,
    StoreRecordId
} from '@xh/hoist/data';
import {ViewRowData} from '@xh/hoist/data/cube/ViewRowData';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {shallowEqualArrays} from '@xh/hoist/utils/impl';
import {logWithDebug, throwIf} from '@xh/hoist/utils/js';
import {castArray, find, forEach, groupBy, isEmpty, isNil, map, uniq} from 'lodash';
import {AggregationContext} from './aggregate/AggregationContext';
import {AggregateRow} from './row/AggregateRow';
import {BaseRow} from './row/BaseRow';
import {BucketRow} from './row/BucketRow';
import {LeafRow} from './row/LeafRow';

export interface ViewConfig {
    /** Query to be used to construct this view. */
    query: Query;

    /**
     * Store(s) to be automatically (re)loaded with data from this view.
     * Optional - read {@link View.result} directly to use without a Store.
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
    leafMap: Map<StoreRecordId, LeafRow>;
}

export interface DimensionValue {
    /** Dimension field. */
    field: CubeField;

    /** Unique non-null values for the dimension */
    values: Set<any>;
}

/**
 * Primary interface for consuming grouped and aggregated data from the cube.
 * Applications should create via the {@link Cube.createView} factory.
 */
export class View extends HoistBase implements FilterBindTarget, FilterValueSource {
    readonly isView = true;
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

    /** The source {@link Cube.info} as of the last time this View was updated. */
    @observable.ref
    info: PlainObject = null;

    /** Timestamp (ms) of the last time this view's data was changed. */
    @observable
    lastUpdated: number;

    // Implementation
    private _rowDatas: ViewRowData[] = null;
    private _leafMap: Map<StoreRecordId, LeafRow> = null;
    private _recordMap: Map<StoreRecordId, StoreRecord> = null;
    private _bucketDependentFields = new Set<string>();
    _aggContext: AggregationContext = null;
    _rowCache: Map<string, BaseRow> = null;

    /** @internal - applications should use {@link Cube.createView} */
    constructor(config: ViewConfig) {
        super();
        makeObservable(this);

        const {query, stores = [], connect = false} = config;

        this.query = query;
        this.stores = this.parseStores(stores);
        this._rowCache = new Map();
        this.fullUpdate();

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

    /**
     * Change the query in some way, re-computing the data in this View to reflect the new query.
     *
     * @param overrides - changes to be applied to the query. May include any arguments to the query
     *      constructor except `cube`, which cannot be changed once set via the initial query.
     */
    @action
    updateQuery(overrides: Partial<QueryConfig>) {
        throwIf(overrides.cube, 'Cannot redirect view to a different cube in updateQuery().');
        const oldQuery = this.query,
            newQuery = oldQuery.clone(overrides);
        if (oldQuery.equals(newQuery)) return;

        this.query = newQuery;

        // Must clear row cache if we have complex aggregates or more than filter changing.
        if (!this.aggregatorsAreSimple || !oldQuery.equalsExcludingFilter(newQuery)) {
            this._rowCache.clear();
        }

        this.fullUpdate();
    }

    /** Gather all unique values for each dimension field in the query. */
    getDimensionValues(): DimensionValue[] {
        const {_leafMap} = this,
            fields = this.query.fields.filter(it => it.isDimension);

        return fields.map(field => {
            const values = new Set();
            _leafMap.forEach(leaf => values.add(leaf[field.name]));
            return {field, values};
        });
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
        this._rowCache.clear();
        this.fullUpdate();
    }

    @action
    noteCubeUpdated(changeLog: StoreChangeLog) {
        const simpleUpdates = this.getSimpleUpdates(changeLog);

        if (!simpleUpdates) {
            this._rowCache.clear();
            this.fullUpdate();
        } else if (!isEmpty(simpleUpdates)) {
            this.dataOnlyUpdate(simpleUpdates);
        } else {
            this.info = this.cube.info;
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
    @logWithDebug
    private fullUpdate() {
        this.filterRecords();
        this.createAggregationContext();
        this.generateRows();
        this.loadStores();
        this.updateResults();
    }

    @logWithDebug
    private dataOnlyUpdate(updates: StoreRecord[]) {
        const {_leafMap, _recordMap, stores} = this,
            updatedRowDatas = new Set<PlainObject>();

        updates.forEach(rec => {
            _recordMap.set(rec.id, rec);
            const leaf = _leafMap.get(rec.id);
            leaf?.applyLeafDataUpdate(rec, updatedRowDatas);
        });

        this.createAggregationContext();

        stores.forEach(store => {
            const recordUpdates = [];
            updatedRowDatas.forEach(rowData => {
                if (store.getById(rowData.id)) recordUpdates.push(rowData);
            });
            store.updateData({update: recordUpdates});
        });
        this.updateResults();
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
        this.result = {rows: _rowDatas, leafMap: _leafMap};
        this.info = this.cube.info;
        this.lastUpdated = Date.now();
    }

    // Generate a new full data representation
    private generateRows() {
        const {query} = this,
            {dimensions, includeRoot} = query,
            rootId = 'root';

        this._bucketDependentFields.clear();

        const records = this._aggContext.filteredRecords;
        const leafMap: Map<StoreRecordId, LeafRow> = new Map();
        let newRows = this.groupAndInsertRecords(records, dimensions, rootId, {}, leafMap);
        newRows = this.bucketRows(newRows, rootId, {});

        if (includeRoot) {
            newRows = [
                this.cachedRow(
                    rootId,
                    newRows,
                    () => new AggregateRow(this, rootId, newRows, null, 'Total', 'Total', {})
                )
            ];
        } else if (!query.includeLeaves && newRows[0]?.isLeaf) {
            newRows = []; // degenerate case, no visible rows
        }

        this._leafMap = leafMap;

        // This is the magic. We only actually reveal to API the network of *data* nodes.
        // This hides all the meta information, as well as unwanted leaves and skipped rows.
        // Underlying network still there and updates will flow up through it via the leaves.
        this._rowDatas = newRows.flatMap(it => it.getVisibleDatas());
    }

    private groupAndInsertRecords(
        records: StoreRecord[],
        dimensions: CubeField[],
        parentId: string,
        appliedDimensions: PlainObject,
        leafMap: Map<StoreRecordId, LeafRow>
    ): BaseRow[] {
        if (!records?.length) return [];

        const rootId = parentId + Cube.RECORD_ID_DELIMITER;

        if (!dimensions?.length) {
            return records.map(r => {
                const id = rootId + r.id,
                    leaf = this.cachedRow(id, null, () => new LeafRow(this, id, r));
                leafMap.set(r.id, leaf);
                return leaf;
            });
        }

        const dim = dimensions[0],
            dimName = dim.name,
            groups = groupBy(records, it => it.data[dimName]);

        appliedDimensions = {...appliedDimensions};
        return map(groups, (groupRecords, strVal) => {
            const val = groupRecords[0].data[dimName],
                id = rootId + `${dimName}=[${strVal}]`;

            appliedDimensions[dimName] = val;

            let children = this.groupAndInsertRecords(
                groupRecords,
                dimensions.slice(1),
                id,
                appliedDimensions,
                leafMap
            );
            children = this.bucketRows(children, id, appliedDimensions);

            return this.cachedRow(
                id,
                children,
                () => new AggregateRow(this, id, children, dim, val, strVal, appliedDimensions)
            );
        });
    }

    private bucketRows(
        rows: BaseRow[],
        parentId: string,
        appliedDimensions: PlainObject
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
            const bucket = this.cachedRow(
                id,
                rows,
                () => new BucketRow(this, id, rows, bucketVal, bucketSpec, appliedDimensions)
            );
            ret.push(bucket);
        });

        return ret;
    }

    // return a list of simple data updates we can apply to leaves.
    // false if leaf population changing, or aggregations are complex
    private getSimpleUpdates(t: StoreChangeLog): StoreRecord[] | false {
        if (!t) return [];
        if (!this.aggregatorsAreSimple) return false;
        const {_leafMap, query} = this;

        // 1) Simple case: no filter
        if (!query.filter) {
            return isEmpty(t.add) && isEmpty(t.remove) && !this.hasDimOrBucketUpdates(t.update)
                ? t.update
                : false;
        }

        // 2) Examine, accounting for filter
        // 2a) Relevant adds or removes fail us
        if (t.add?.some(rec => query.test(rec))) return false;
        if (t.remove?.some(id => _leafMap.has(id))) return false;

        // 2b) Examine updates, if they change w.r.t. filter then fail otherwise take relevant
        const ret = [];
        if (t.update) {
            for (const r of t.update) {
                const passes = query.test(r),
                    present = _leafMap.has(r.id);

                if (passes !== present) return false;
                if (present) ret.push(r);
            }
        }

        // 2c) Examine the final set of updates for any changes to dimension field values which would
        //     require rebuilding the row hierarchy
        if (this.hasDimOrBucketUpdates(ret)) return false;

        return ret;
    }

    private hasDimOrBucketUpdates(update: StoreRecord[]): boolean {
        const {dimensions} = this.query,
            bucketDependentFields = Array.from(this._bucketDependentFields);

        if (isEmpty(dimensions) && isEmpty(bucketDependentFields)) return false;

        const fieldNames = uniq([...dimensions.map(it => it.name), ...bucketDependentFields]);
        for (const rec of update) {
            const curRec = this._leafMap.get(rec.id);
            if (fieldNames.some(name => rec.data[name] !== curRec.data[name])) return true;
        }

        return false;
    }

    private cachedRow<T extends BaseRow>(id: string, children: BaseRow[], fn: () => T): T {
        let ret = this._rowCache.get(id);
        if (ret && (ret.isLeaf || shallowEqualArrays(ret.children, children))) {
            return ret as T;
        }
        ret = fn();
        this._rowCache.set(id, ret);
        return ret as T;
    }

    private filterRecords() {
        const {query, cube} = this,
            {hasFilter} = query,
            ret = new Map();

        cube.store.records.forEach(r => {
            if (!hasFilter || query.test(r)) ret.set(r.id, r);
        });

        this._recordMap = ret;
    }

    private createAggregationContext() {
        this._aggContext = new AggregationContext(this, Array.from(this._recordMap.values()));
    }

    private get aggregatorsAreSimple() {
        return this.fields.every(({aggregator}) => !aggregator || aggregator.dependsOnChildrenOnly);
    }

    private parseStores(stores: Some<Store>): Store[] {
        const ret = castArray(stores);

        // Views mutate the rows they feed to connected stores  -- `reuseRecords` not appropriate
        throwIf(
            ret.some(s => s.reuseRecords),
            'Store.reuseRecords cannot be used on a Store that is connected to a Cube View'
        );

        throwIf(
            ret.some(s => s.idEncodesTreePath) &&
                (!isNil(this.cube.bucketSpecFn) || !isNil(this.cube.omitFn)),
            'Store.idEncodesTreePath cannot be used on a Store that is connected to a Cube with a `bucketSpecFn` or `omitFn`'
        );

        return ret;
    }

    override destroy() {
        this.disconnect();
        super.destroy();
    }
}
