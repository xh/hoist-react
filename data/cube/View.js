/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Cube} from './Cube';
import {ValueFilter} from './filter';
import {createAggregateRow, createLeafRow} from './impl';
import {observable, action} from 'mobx';
import {throwIf} from '../../utils/js';

import {isEmpty, groupBy, map, uniq} from 'lodash';

/**
 * Primary interface for consuming grouped and aggregated data from the cube.
 *
 * Not created directly by application.  Applications should use the method
 * Cube.createView() instead.
 */
export class View {

    /**
     * @member {Query}
     * Query defining this View.  Update with updateView();
     */
    get query() {
        return this._query;
    }

    /**
     * @member {Object}
     * Results of this view.  Will contain a single property 'rows' containing an array of
     * hierarchical data objects. This is an observable property.
     */
    @observable.ref
    result = null;

    /**
     * @member {Store}
     * Store to which results of this view should be (re)loaded
     */
    store = null;

    /**
     * @member {Object}
     *
     * Cube info associated with the view when it was last updated.
     * This is an observable property.
     */
    @observable.ref
    info = null;

    // Implementation
    _rows = null;
    _leafMap = null;
    _query = null;

    /**
     * @private.  Applications should use createView() instead.
     *
     * @param {Object} c - config object.
     * @param {Query} c.query - query to be used to construct this view.
     * @param {Store} [c.store] - Store to be loaded/reloaded with
     *      data from this view.  Optional. To receive data only, use the
     *      rows property instead.
     * @param {boolean} [c.connect] - true to updated rows property and loaded
     *      store when data in the underlying cube is changed.
     */
    constructor({query, connect = false, store = null}) {
        this._query = query;
        this.store = store;
        this.fullUpdate();

        if (connect) {
            this.cube._connectedViews.add(this);
        }
    }

    //--------------------
    // Main Public API
    //--------------------
    get cube() {
        return this.query.cube;
    }

    get fields() {
        return this.query.fields;
    }

    get isConnected() {
        return this.cube._connectedViews.has(this);
    }

    disconnect() {
        this.cube._connectedViews.delete(this);
    }

    /**
     * Change the query in some way.
     *
     * Setting this property will cause the data in this view to be re-computed to reflect
     * the new query.
     *
     * @param {Object} overrides - changes to be applied to the query.  May include any
     *      arguments to the query constructor, other than cube.
     */
    @action
    updateQuery(overrides) {
        throwIf(overrides.cubes, 'Cannot redirect view to a different cube in updateQuery().');
        this._query = this._query.clone(overrides);
        this.fullUpdate();
    }

    /**
     * Gathers all unique non-null values for each dimension used in the query
     * @returns {DimensionValue[]}
     */
    getDimensionValues() {
        const leaves = Array.from(this._leafMap.values()),
            {dimensions} = this._query,
            ret = [];

        dimensions.forEach(field => {
            const values = uniq(leaves.map(it => it[field.name]).filter(it => it !== null));
            ret.push({field, values});
        });

        return ret;
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
        const {store} = this;
        this.generateRows();

        if (store) store.loadData(this._rows);
        this.result = {rows: this._rows};
        this.info = this.cube.info;
    }

    @action
    dataOnlyUpdate(updates) {
        const {store, _leafMap} = this;

        const updatedRows = new Set();
        updates.forEach(rec => {
            const leaf = _leafMap.get(rec.id);
            leaf?._meta.applyDataUpdate(rec, updatedRows);
        });
        const recordUpdates = [];
        updatedRows.forEach(row => {
            if (store.getById(row.id)) recordUpdates.push(row);
        });

        if (store) store.updateData({update: recordUpdates});
        this.result = {rows: this._rows};
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
        if (includeRoot) {
            newRows = [createAggregateRow(this, rootId, newRows, null, 'Total', {})];
        } else if (!query.includeLeaves && newRows[0]?._meta.isLeaf) {
            newRows = []; // degenerate case, no visible rows
        }
        this._leafMap = leafMap;
        this._rows = newRows;
    }

    groupAndInsertLeaves(leaves, dimensions, parentId, appliedDimensions) {
        if (isEmpty(dimensions)) return leaves;

        const dim = dimensions[0],
            dimName = dim.name,
            groups = groupBy(leaves, (it) => it[dimName]);

        appliedDimensions = {...appliedDimensions};
        return map(groups, (groupLeaves, val) => {
            appliedDimensions[dimName] = val;
            const id = parentId + Cube.RECORD_ID_DELIMITER + ValueFilter.encode(dimName, val);
            const newChildren = this.groupAndInsertLeaves(groupLeaves, dimensions.slice(1), id, appliedDimensions);
            return createAggregateRow(this, id, newChildren, dim, val, appliedDimensions);
        });
    }

    // return a list of simple updates for leaves we have or false if leaf population changing
    getSimpleUpdates(t) {
        if (!t) return [];
        const {filters} = this.query,
            {_leafMap} = this,
            recordFilter = (r) => filters.every(f => f.fn(r));

        // 1) Simple case: no filters
        if (isEmpty(filters)) {
            return isEmpty(t.add) && isEmpty(t.remove) ? t.update : false;
        }

        // 2) Examine, accounting for filters
        // 2a) Relevant adds or removes fail us
        if (t.add?.any(recordFilter)) return false;
        if (t.remove?.any(id => _leafMap.has(id))) return false;

        // 2b) Examine updates, if they change w.r.t. filter then fail otherwise take relevant
        const ret = [];
        if (t.update) {
            for (const r of t.update) {
                const passes = recordFilter(r),
                    present = _leafMap.has(r.id);
                if (passes !== present) return false;

                if (present) ret.push(r);
            }
        }

        return ret;
    }

    generateLeaves(records) {
        const ret = new Map();
        let {filters} = this.query;
        if (isEmpty(filters)) filters = null;

        records.forEach(rec => {
            if (!filters || filters.every(f => f.fn(rec))) {
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
 * @property {Array} values - unique non-null values for the dimension
 */
