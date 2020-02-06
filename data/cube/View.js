/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Cube} from './Cube';
import {ValueFilter} from './filter';
import {AggregateRow, LeafRow} from './impl';

import {isEmpty, groupBy, map} from 'lodash';

/**
 * Primary interface for consuming grouped and aggregated data from the cube.
 *
 * Not created directly by application.  Applications should use the method
 * Cube.createView() instead.
 */
export class View {

    /** @member {Query} */
    query = null;

    /**
     * @member {Object []}
     * Results of this view, as an array of hierarchical row objects.
     */
    rows = null;

    /**
     * @member {Store}
     * Store to which results of this view should be (re)loaded
     */
    store = null;


    // Implementation
    leafMap = null; // Map of leafRows

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
        this.query = query;
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

    get info() {
        return this.cube.info;
    }

    get isConnected() {
        return this.cube._connectedViews.has(this);
    }

    disconnect() {
        this.cube._connectedViews.delete(this);
    }

    //-----------------------
    // Entry point for cube
    //-----------------------
    noteCubeLoaded() {
        this.fullUpdate();
    }

    noteCubeUpdated(changeLog) {
        const simpleUpdates = this.getSimpleUpdates(changeLog);

        if (!simpleUpdates) {
            this.fullUpdate();
        } else {
            this.simpleUpdate(simpleUpdates);
        }
    }

    //------------------------
    // Implementation
    //------------------------
    fullUpdate() {
        const {store} = this;

        this.generateRows();
        if (store) store.loadData(this.rows);
    }

    simpleUpdate(updates) {
        const {store} = this;

        this.generateRows();
        if (store) store.loadData(this.rows);
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
            newRows = [new AggregateRow(this, rootId, newRows, null, 'Total', {})];
        } else if (!query.includeLeaves && newRows[0]?._meta.isLeaf) {
            newRows = []; // degenerate case, no visible rows
        }

        this.leafMap = leafMap;
        this.rows = newRows;
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
            return new AggregateRow(this, id, newChildren, dim, val, appliedDimensions);
        });
    }

    // return a list of simple updates for leaves we have or false if leaf population changing
    getSimpleUpdates(t) {
        const {filters} = this.query,
            {leafMap} = this,
            recordFilter = (r) => filters.every(f => f.fn(r));

        // 1) Simple case: no filters
        if (isEmpty(filters)) {
            return isEmpty(t.add) && isEmpty(t.remove) ? t.update : false;
        }

        // 2) Examine, accounting for filters
        // 2a) Relevant adds or removes fail us
        if (t.add?.any(recordFilter)) return false;
        if (t.remove?.any(id => leafMap.has(id))) return false;

        // 2b) Examine updates, if they change w.r.t. filter then fail otherwise take relevant
        const ret = [];
        for (const r of t.updates) {
            const passes = recordFilter(r),
                present = leafMap.has(r.id);
            if (passes !== present) return false;

            if (present) ret.push(r);
        }

        return ret;
    }

    generateLeaves(records) {
        const ret = new Map();
        let {filters} = this.query;
        if (isEmpty(filters)) filters = null;

        records.forEach(rec => {
            if (!filters || filters.every(f => f.fn(rec))) {
                ret.set(rec.id, new LeafRow(this, rec));
            }
        });
        return ret;
    }

    destroy() {
        this.disconnect();
    }
}