/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {
    Query,
    Cube,
    AggregateCubeRecord,
    CubeRecord,
    ValueFilter
} from '@xh/hoist/data/cube';
import {isEmpty, groupBy, forEach, clone, pick, map} from 'lodash';

/**
 * Primary interface for consuming grouped and aggregated data from the cube.
 */
export class View {

    // Immutable
    cube = null;

    // Current State
    _query = null;
    _boundStore = null;

    _records = [];  // top-level record(s)
    _leaves = [];   // all leaf records by id

    /**
     * @param {Object} c - View configuration.
     * @param {Cube} c.cube - source Hoist Cube for this view.
     * @param {(Query|Object)} c.query - to be used to construct this View (or config to create).
     * @param {boolean} [c.connect] - true to update this View when cube source data changes.
     * @param {Store} [c.boundStore] - Store instance to bind to this View. If provided, this View
     *      will automatically load and update Store records as its data changes.
     */
    constructor({cube, query, connect = false, boundStore = null}) {
        this.cube = cube;
        this.setQuery(query);
        this.setBoundStore(boundStore);

        // Connect late to avoid connecting if an exception thrown.
        if (connect) {
            this.cube.connect(this);
        }
    }

    //--------------------
    // Main Public API
    //--------------------
    /**
     * Return current state of view as a collection of anonymous json nodes.
     */
    async getDataAsync() {
        return this.getRecordsAsData(this._records);
    }

    getQuery() {
        return this._query;
    }

    setQuery(query) {
        if (query != this._query) {
            if (!(query instanceof Query)) {
                query = new Query({
                    ...query,
                    cube: this.cube
                });
            }
            this._query = query;
            this.loadRecordsFromCube();
        }
    }

    updateQuery(params) {
        const newQuery = this.getQuery().clone(params);
        this.setQuery(newQuery);
    }

    getBoundStore() {
        return this._boundStore;
    }

    setBoundStore(store) {
        if (store != this._boundStore) {
            this._boundStore = store;
            this.loadBoundStore();
        }
    }

    disconnect() {
        this.cube.disconnect(this);
    }

    isConnected() {
        return this.cube.isConnected(this);
    }

    getInfo() {
        return this.cube.getInfo();
    }

    getDimensionValues() {
        const {_leaves} = this,
            {fields} = this._query,
            dims = pick(fields, f => f.isDimension),
            ret = [];

        forEach(dims, dim => {
            const vals = new Set();
            _leaves.forEach(rec => {
                const val = rec.get(dim.name);
                if (val != null) vals.add(val);
            });

            ret.push({
                name: dim.name,
                displayName: dim.displayName,
                values: vals
            });
        });

        return ret;
    }

    //-----------------------
    // Entry point for cube
    //-----------------------
    noteCubeLoaded() {
        this.loadRecordsFromCube();
    }

    //------------------------
    // Implementation
    //------------------------
    loadRecordsFromCube() {
        const {_query, cube} = this,
            {dimensions, includeRoot, fields} = _query,
            {records} = cube,
            sourceRecords = Array.from(records.values());

        // Create the new structure
        const newLeaves = this.createLeaves(sourceRecords),
            newRecords =  this.groupAndInsertLeaves(newLeaves, dimensions);

        this._leaves = newLeaves;
        this._records = includeRoot ?
            [new AggregateCubeRecord(fields, this.getRootId(), newRecords, null, 'Total')] :
            newRecords;

        // Broadcast any changes
        this.loadBoundStore();
    }

    destroy() {
        this.disconnect();
        this._boundStore = null;
    }


    createLeaves(sourceRecords) {
        const {filters, fields} = this._query;

        // 0) Filter source records
        if (filters && filters.length) {
            sourceRecords = sourceRecords.filter(rec => filters.every(f => f.matches(rec)));
        }

        // 1) Create and store cloned leaves.
        return sourceRecords.map(r => new CubeRecord(fields, r.data, r.id));
    }

    /**
     * Incorporate a set of new leaf records, along a set of (remaining) dimensions.
     * This is called recursively, so that the lowest level grouping is applied first.
     *
     * @param {CubeRecord[]} leaves - new leaf records to be incorporated into the tree
     * @param {String[]} dimensions - remaining dimensions to group on
     * @param {int} parentId - id of the parent node these leaves are to be inserted at.
     * @return {CubeRecord[]}, records to be added at this level to accommodate the leaf insertion.
     */
    groupAndInsertLeaves(leaves, dimensions, parentId = this.getRootId()) {
        if (!dimensions || isEmpty(dimensions)) return leaves;

        const {fields} = this._query,
            dim = dimensions[0],
            groups = groupBy(leaves, (it) => it.get(dim.name));

        return map(groups, (groupLeaves, val) => {
            const id = parentId + Cube.RECORD_ID_DELIMITER + ValueFilter.encode(dim.name, val);
            const newChildren = this.groupAndInsertLeaves(groupLeaves, dimensions.slice(1), id);
            return new AggregateCubeRecord(fields, id, newChildren, dim, val);
        });
    }

    loadBoundStore() {
        const {_records, _boundStore} = this;
        if (_boundStore) {
            _boundStore.loadData(this.getRecordsAsData(_records));
        }
    }

    getRecordsAsData(records) {
        const {_query: q, cube: {_lockFn}} = this;

        if (!records.length || (!q.includeLeaves && records[0].isLeaf)) {
            return [];
        }

        return records.map(rec => {
            let data = clone(rec.data),
                dim = rec.dim,
                children = rec.children;

            if (children) {
                // Potentially Lock children
                if (_lockFn && _lockFn(rec)) {
                    data.locked = true;
                    children = [];
                } else if (children.length == 1) {
                    // ... or drill past single child if it is an identical 'child' dimension.
                    const childRec = children[0],
                        childDim = childRec.dim;

                    if (dim && childDim && childDim.parentDimension == dim.name &&
                        childRec.get(childDim.name) == rec.get(dim.name)) {
                        children = childRec.children;
                    }
                }

                // 1) serialize to store data recursively
                const childrenAsData = this.getRecordsAsData(children);
                if (childrenAsData.length) {
                    data.children = childrenAsData;
                }
            }
            data.xhDimension = dim ? dim.name : null;
            return data;
        });
    }

    getRootId() {
        return this._query.filtersAsString();
    }
}