/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {FieldFilter} from '@xh/hoist/data';
import {castArray, forEach, groupBy, isEmpty, isNil, map} from 'lodash';
import {action, observable} from 'mobx';

import {throwIf} from '../../utils/js';
import {Cube} from './Cube';
import {createAggregateRow, createBucketRow} from './impl/AggregateRow';
import {createLeafRow} from './impl/LeafRow';
import {Query} from './Query';

/**
 * Primary interface for consuming grouped and aggregated data from the cube.
 * Applications should create via the {@see Cube.createView()} factory.
 */
export class View {

    /** @member {Query} - Query defining this View. Update via `updateQuery()`. */
    @observable.ref
    query = null;

    /**
     * @member {Object} - results of this view, an observable object with a `rows` property
     *      containing an array of hierarchical data objects.
     */
    @observable.ref
    result = null;

    /** @member {Store[]} - Stores to which results of this view should be (re)loaded. */
    stores = null;

    /** @member {Object} - observable Cube info associated with this View when last updated. */
    @observable.ref
    info = null;

    // Implementation
    _rows = null;
    _leafMap = null;

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
    constructor({query, connect = false, stores = []}) {
        this.query = query;
        this.stores = castArray(stores);
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
     *      the query constructor, other than cube.
     */
    @action
    updateQuery(overrides) {
        throwIf(overrides.cubes, 'Cannot redirect view to a different cube in updateQuery().');
        this.query = this.query.clone(overrides);
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

    //-----------------------
    // Entry point for cube
    //-----------------------
    @action
    noteCubeLoaded() {
        this.fullUpdate();
    }

    @action
    noteCubeUpdated(changeLog) {
        const simpleUpdates = this.getSimpleUpdates(changeLog);

        if (!simpleUpdates) {
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
    @action
    fullUpdate() {
        this.generateRows();

        // Load stores and observable state.
        // Skip degenerate root in stores/grids, but preserve in object api.
        const {stores, _leafMap, _rows} = this,
            storeRows = _leafMap.size !== 0 ? _rows : [];

        stores.forEach(s => s.loadData(storeRows));
        this.result = {rows: _rows, leafMap: _leafMap};
        this.info = this.cube.info;
    }

    @action
    dataOnlyUpdate(updates) {
        const {_leafMap} = this;

        const updatedRows = new Set();
        updates.forEach(rec => {
            const leaf = _leafMap.get(rec.id);
            leaf?._meta.applyDataUpdate(rec, updatedRows);
        });
        this.stores.forEach(store => {
            const recordUpdates = [];
            updatedRows.forEach(row => {
                if (store.getById(row.id)) recordUpdates.push(row);
            });
            store.updateData({update: recordUpdates});
        });
        this.result = {rows: this._rows, leafMap: this._leafMap};
        this.info = this.cube.info;
    }

    // Generate a new full data representation
    generateRows() {
        const {query} = this,
            {dimensions, includeRoot, cube} = query,
            rootId = query.filtersAsString();

        const leafMap = this.generateLeaves(cube.store.records),
            leafArray = Array.from(leafMap.values());

        let newRows = this.groupAndInsertLeaves(leafArray, dimensions, rootId, {});

        if (this.cube.bucketSpecFn) newRows = this.bucketRows(newRows, null, rootId);

        if (includeRoot) {
            newRows = [createAggregateRow(this, rootId, newRows, null, 'Total', {})];
        } else if (!query.includeLeaves && newRows[0]?._meta.isLeaf) {
            newRows = []; // degenerate case, no visible rows
        }

        this._leafMap = leafMap;
        this._rows = newRows;
    }

    groupAndInsertLeaves(leaves, dimensions, parentId, appliedDimensions) {
        if (isEmpty(dimensions) || isEmpty(leaves)) return leaves;

        const dim = dimensions[0],
            dimName = dim.name,
            groups = groupBy(leaves, (it) => it[dimName]);

        appliedDimensions = {...appliedDimensions};
        return map(groups, (groupLeaves, val) => {
            appliedDimensions[dimName] = val;
            const filter = new FieldFilter({field: dimName, op: '=', value: val}),
                id = parentId + Cube.RECORD_ID_DELIMITER + Query.filterAsString(filter),
                newChildren = this.groupAndInsertLeaves(groupLeaves, dimensions.slice(1), id, appliedDimensions);

            return createAggregateRow(this, id, newChildren, dim, val, appliedDimensions);
        });
    }

    bucketRows(rows, parentRow, parentId = parentRow?.id) {
        const {bucketSpecFn} = this.cube,
            bucketSpec = bucketSpecFn(parentRow, rows),
            buckets = {},
            ret = [];

        rows.forEach(row => {
            // Depth-first bucketing of child rows
            if (row.children) {
                row.children = this.bucketRows(row.children, row);
            }

            // Determine which bucket to put this row into (if any)
            const bucket = bucketSpec?.bucketFn(row);
            if (isNil(bucket)) {
                ret.push(row);
            } else {
                if (!buckets[bucket]) buckets[bucket] = [];
                buckets[bucket].push(row);
            }
        });

        // Create new rows for each bucket and add to the result
        forEach(buckets, (rows, bucket) => {
            ret.push(createBucketRow(bucket, this, parentId, parentRow, rows, bucketSpec?.labelFn));
        });

        return ret;
    }

    // return a list of simple updates for leaves we have or false if leaf population changing
    getSimpleUpdates(t) {
        if (!t) return [];
        const {_leafMap, query} = this;

        // 1) Simple case: no filter
        if (!query.filter) {
            return isEmpty(t.add) && isEmpty(t.remove) ? t.update : false;
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

        return ret;
    }

    generateLeaves(records) {
        const ret = new Map();
        records.forEach(rec => {
            if (this.query.test(rec)) {
                ret.set(rec.id, createLeafRow(this, rec));
            }
        });
        return ret;
    }

    destroy() {
        this.disconnect();
    }
}

/**
 * @typedef DimensionValue
 * @property {CubeField} field - dimension field
 * @property {Set} values - unique non-null values for the dimension
 */
