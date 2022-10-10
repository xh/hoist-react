/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {HoistBase} from '@xh/hoist/core';
import {Cube} from '@xh/hoist/data';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {throwIf, logWithDebug} from '@xh/hoist/utils/js';
import {shallowEqualArrays} from '@xh/hoist/utils/impl';
import {castArray, forEach, groupBy, isEmpty, isNil, map, isEqual, keys, find} from 'lodash';
import {AggregationContext} from './aggregate/AggregationContext';

import {AggregateRow} from './row/AggregateRow';
import {BucketRow} from './row/BucketRow';
import {LeafRow} from './row/LeafRow';

/**
 * Primary interface for consuming grouped and aggregated data from the cube.
 * Applications should create via the {@see Cube.createView()} factory.
 */
export class View extends HoistBase {

    get isView() {return true}

    /** @member {Query} - Query defining this View. Update via `updateQuery()`. */
    @observable.ref query = null;

    /**
     * @member {Object} - results of this view, an observable object with a `rows` property
     *      containing an array of hierarchical data objects.
     */
    @observable.ref result = null;

    /** @member {Store[]} - Stores to which results of this view should be (re)loaded. */
    stores = null;

    /** @member {Object} - observable Cube info associated with this View when last updated. */
    @observable.ref info = null;

    /** @member {number} - timestamp (ms) of the last time this view's data was changed. */
    @observable lastUpdated;

    // Implementation
    _rows = null;
    _rowCache = null;
    _leafMap = null; // Leaves, by source record id.
    _recordMap = null; // Records, by source record id
    _aggContext = null;

    /**
     * @private - applications should use `Cube.createView()`.
     *
     * @param {Object} c - config object.
     * @param {Query} c.query - query to be used to construct this view.
     * @param {(Store[]|Store)} [c.stores] - Stores to be loaded/reloaded with data from this view.
     *      Optional - to receive data only, observe/read this class's `result` property instead.
     * @param {boolean} [c.connect] - true to reactively update this class's `result` and connected
     *      store(s) (if any) when data in the underlying Cube is changed.
     */
    constructor({query, stores = [], connect = false}) {
        super();
        makeObservable(this);

        this.query = query;
        this.stores = castArray(stores);
        this._rowCache = new Map();
        this.fullUpdate();

        if (connect) {
            this.cube._connectedViews.add(this);
        }
    }

    //--------------------
    // Main Public API
    //--------------------
    /** @return {Cube} */
    get cube() {return this.query.cube}

    /** @return {CubeField[]} */
    get fields() {return this.query.fields}

    /** @return {string[]} */
    get fieldNames() {return map(this.fields, 'name')}

    /** @return {Filter} */
    get filter() {return this.query.filter}

    /** @return {boolean} */
    get isConnected() {return this.cube.viewIsConnected(this)}

    /** @return {boolean} */
    get isFiltered() {
        return !isEmpty(this.cube.filters) && !isEmpty(this.query.filter);
    }

    /** Stop receiving live updates into this view when the linked Cube data changes. */
    disconnect() {this.cube.disconnectView(this)}

    /**
     * Change the query in some way, re-computing the data in this View to reflect the new query.
     *
     * @param {Object} overrides - changes to be applied to the query. May include any arguments to
     *      the query constructor with the exception of `cube`, which cannot be changed on a view
     *      once set via the initial query.
     */
    @action
    updateQuery(overrides) {
        throwIf(overrides.cube, 'Cannot redirect view to a different cube in updateQuery().');
        const newQuery = this.query.clone(overrides);
        if (this.query.equals(newQuery)) return;

        this.query = newQuery;

        // Only blow away row cache if more than filter changing, or we have complex aggregates.
        if (!this.aggregatorsAreSimple || !isEqual(keys(overrides), ['filter'])) {
            this._rowCache.clear();
        }

        this.fullUpdate();
    }

    /**
     * Gathers all unique values for each dimension field in the query
     * @returns {DimensionValue[]}
     */
    getDimensionValues() {
        const {_leafMap} = this,
            fields = this.query.fields.filter(it => it.isDimension);

        return fields.map(field => {
            const values = new Set();
            _leafMap.forEach(leaf => values.add(leaf[field.name]));
            return {field, values};
        });
    }

    /**
     * Get a specific Field by name.
     * @param {string} name - field name to locate.
     * @return {CubeField}
     */
    getField(name) {
        return find(this.fields, {name});
    }

    /**
     * @param {(Store[]|Store)} stores - Stores to be loaded/reloaded with data from this view.
     */
    setStores(stores) {
        this.stores = castArray(stores);
        this.loadStores();
    }

    /**
     * @param {Filter} filter - Update the filter on the current Query.
     */
    setFilter(filter) {
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
    noteCubeUpdated(changeLog) {
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

    //------------------------
    // Implementation
    //------------------------
    @logWithDebug
    fullUpdate() {
        this.filterRecords();
        this.createAggregationContext();
        this.generateRows();
        this.loadStores();
        this.updateResults();
    }

    dataOnlyUpdate(updates) {
        const {_leafMap, _recordMap, stores} = this,
            updatedRows = new Set();

        updates.forEach(rec => {
            _recordMap.set(rec.id, rec);
            const leaf = _leafMap.get(rec.id);
            leaf?.applyDataUpdate(rec, updatedRows);
        });

        this.createAggregationContext();

        stores.forEach(store => {
            const recordUpdates = [];
            updatedRows.forEach(row => {
                if (store.getById(row.id)) recordUpdates.push(row);
            });
            store.updateData({update: recordUpdates});
        });
        this.updateResults();
    }

    loadStores() {
        const {_leafMap, _rows} = this;
        if (!_leafMap || !_rows) return;

        // Skip degenerate root in stores/grids, but preserve in object api.
        const storeRows = _leafMap.size !== 0 ? _rows : [];
        this.stores.forEach(s => s.loadData(storeRows));
    }

    updateResults() {
        const {_leafMap, _rows} = this;
        this.result = {rows: _rows, leafMap: _leafMap};
        this.info = this.cube.info;
        this.lastUpdated = Date.now();
    }

    // Generate a new full data representation
    generateRows() {
        const {query} = this,
            {dimensions, includeRoot} = query,
            rootId = 'root';

        const records = this._aggContext.filteredRecords;
        const leafMap = new Map();
        let newRows = this.groupAndInsertRecords(records, dimensions, rootId, {}, leafMap);
        newRows = this.bucketRows(newRows, rootId, {});

        if (includeRoot) {
            newRows = [
                this.cachedRow(rootId, newRows,
                    () => new AggregateRow(this, rootId, newRows, null, 'Total', {})
                )
            ];
        } else if (!query.includeLeaves && newRows[0]?.isLeaf) {
            newRows = []; // degenerate case, no visible rows
        }

        this._leafMap = leafMap;

        // This is the magic.  We only actually reveal to API the network of *data* nodes.
        // This hides all the meta information, as well as unwanted leaves and skipped rows.
        // Underlying network still there and updates will flow up through it via the leaves.
        newRows.forEach(it => it.applyVisibleChildren());
        this._rows = newRows.map(it => it.data);
    }

    groupAndInsertRecords(records, dimensions, parentId, appliedDimensions, leafMap) {
        if (isEmpty(records)) return records;

        const rootId = parentId + Cube.RECORD_ID_DELIMITER;

        if (isEmpty(dimensions)) {
            return map(records, (r) => {
                const id = rootId + r.id,
                    leaf = this.cachedRow(id, null, () => new LeafRow(this, id, r));
                leafMap.set(r.id, leaf);
                return leaf;
            });
        }

        const dim = dimensions[0],
            dimName = dim.name,
            groups = groupBy(records, (it) => it.data[dimName]);

        appliedDimensions = {...appliedDimensions};
        return map(groups, (groupRecords, val) => {
            appliedDimensions[dimName] = val;
            const id = rootId + `${dimName}=[${val}]`;

            let children = this.groupAndInsertRecords(groupRecords, dimensions.slice(1), id, appliedDimensions, leafMap);
            children = this.bucketRows(children, id, appliedDimensions);

            return this.cachedRow(id, children,
                () => new AggregateRow(this, id, children, dim, val, appliedDimensions)
            );
        });
    }

    bucketRows(rows, parentId, appliedDimensions) {
        if (!this.cube.bucketSpecFn) return rows;

        const bucketSpec = this.cube.bucketSpecFn(rows);
        if (!bucketSpec) return rows;

        if (!this.query.includeLeaves && rows[0]?.isLeaf) return rows;

        const {name: bucketName, bucketFn} = bucketSpec,
            buckets = {},
            ret = [];

        // Determine which bucket to put this row into (if any)
        rows.forEach(row => {
            const bucketVal = bucketFn(row);
            if (isNil(bucketVal)) {
                ret.push(row);
            } else {
                if (!buckets[bucketVal]) buckets[bucketVal] = [];
                buckets[bucketVal].push(row);
            }
        });

        // Create new rows for each bucket and add to the result
        forEach(buckets, (rows, bucketVal) => {
            const id = parentId + Cube.RECORD_ID_DELIMITER + `${bucketName}=[${bucketVal}]`;
            const bucket = this.cachedRow(id, rows,
                () => new BucketRow(this, id, rows, bucketVal, bucketSpec, appliedDimensions)
            );
            ret.push(bucket);
        });

        return ret;
    }

    // return a list of simple data updates we can apply to  leaves.
    // false if leaf population changing, or aggregations are complex
    getSimpleUpdates(t) {
        if (!t) return [];
        if (!this.aggregatorsAreSimple) return false;
        const {_leafMap, query} = this;

        // 1) Simple case: no filter
        if (!query.filter) {
            return isEmpty(t.add) && isEmpty(t.remove) && !this.hasDimUpdates(t.update) ? t.update : false;
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
        if (this.hasDimUpdates(ret)) return false;

        return ret;
    }

    hasDimUpdates(update) {
        const {dimensions} = this.query;
        if (isEmpty(dimensions)) return false;

        const dimNames = dimensions.map(it => it.name);
        for (const rec of update) {
            const curRec = this._leafMap.get(rec.id);
            if (dimNames.some(name => rec.data[name] !== curRec.data[name])) return true;
        }

        return false;
    }

    cachedRow(id, children, fn) {
        let ret = this._rowCache.get(id);
        if (ret && (ret.isLeaf || shallowEqualArrays(ret.children, children))) {
            return ret;
        }
        ret = fn();
        this._rowCache.set(id, ret);
        return ret;
    }

    filterRecords() {
        const {query, cube} = this,
            ret = new Map();
        cube.store.records
            .filter(r => query.test(r))
            .forEach(r => ret.set(r.id, r));
        this._recordMap = ret;
    }

    createAggregationContext() {
        this._aggContext = new AggregationContext(this, Array.from(this._recordMap.values()));
    }

    get aggregatorsAreSimple() {
        return this.query.fields.every(
            ({aggregator}) => !aggregator || aggregator.dependsOnChildrenOnly
        );
    }

    destroy() {
        this.disconnect();
        super.destroy();
    }
}

/**
 * @typedef DimensionValue
 * @property {CubeField} field - dimension field
 * @property {Set} values - unique non-null values for the dimension
 */
