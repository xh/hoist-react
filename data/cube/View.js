/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {
    Query,
    Cube,
    AggregateRecord,
    Record,
    ValueFilter
} from '@xh/hoist/data/cube';
import {isEmpty, groupBy, forEach, clone} from 'lodash';
import {observable} from '@xh/hoist/mobx';

/**
 * Primary interface for consuming grouped and aggregated data from the cube.
 */
export class View {

    // Immutable
    cube = null;

    // Current State
    _query = null;
    _boundStore = null;

    @observable.ref
    _records = [];   // top-level record(s)
    _leafMap = new Map();   // all leaf records by id
    _aggMap = new Map();    // all aggregate records by id

    /**
     * Create this object.
     *
     * @param cube, source Cube for this view.
     * @param query, Query to be used to construct this view (or config to create same).
     * @param connect, boolean.  Should this view receive updates when its source Cube changes?
     * @param boundStore, Store.  An optional store to bind to this view.
     *      If provided, this store will automatically be updated when this view changes.
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
     *
     * Main entry point.
     */
    async getDataAsync() {
        return this.getRecordsAsData(this._records, true);
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
        const {_leafMap} = this,
            fields = this._query,
            ret = [];

        forEach(fields, f => {
            if (f.isDimension) {
                const vals = [];
                _leafMap.forEach(rec => {
                    const lVal = rec.get(f.name);
                    if (lVal != null && !vals.includes(lVal)) {
                        vals.push(lVal);
                    }
                });

                ret.push({
                    name: f.name,
                    displayName: f.displayName,
                    values: vals
                });
            }
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
            {dimensions} = _query,
            {records} = cube,
            sourceRecords = Array.from(records.values());

        this._records = null;
        this._aggMap = new Map();
        this._leafMap = new Map();

        // Create the new structure
        const newLeaves = this.createLeaves(sourceRecords);
        this._records = this.groupAndInsertLeaves(newLeaves, dimensions, [], []);
        if (_query.includeRoot) {
            this._records = [new AggregateRecord(_query.fields, this.getRootId(), this._records, null, 'Total')];
        }

        // Broadcast any changes
        this.loadBoundStore();
    }

    destroy() {
        this.disconnect();
        this._boundStore = null;
    }

    /**
     * Add new source records to this view.
     *
     * @param sourceRecords, records from underlying cube.
     * @return Array, newly added leaves associated with inserted records.
     */
    createLeaves(sourceRecords) {
        const {_query, _leafMap} = this,
            {filters, fields} = _query;

        // 0) Filter source records
        if (filters && filters.length) {
            sourceRecords = sourceRecords.filter(rec => filters.every(f => f.matches(rec)));
        }

        // 1) Create and store cloned leaves.
        const ret = sourceRecords.map(r => new Record(fields, r.data));
        ret.forEach(r => _leafMap.set(r.id, r));

        return ret;
    }

    /**
     * Incorporate a set of new leaf records, along a set of (remaining) dimensions.
     * This is called recursively, so that the lowest level grouping is applied first.

     * @param leaves, new leaf records to be incorporated into the tree
     * @param dimensions, remaining dimensions to group on
     * @param aggsAdded, Array of added aggregates by this operation.  For population by this method.
     * @param aggsToUpdate, Array of existing aggregates which will need to be updated as a result
     *          of this operation.  For population by this method.
     * @param parentId, id of the parent node these leaves are to be inserted at.
     *
     * @return Array, records to be added at this level to accommodate the leaf insertion.
     */
    groupAndInsertLeaves(leaves, dimensions, aggsAdded, aggsToUpdate, parentId = this.getRootId()) {
        if (!dimensions || isEmpty(dimensions)) return leaves;

        const {_aggMap, _query} = this,
            {fields} = _query,
            dim = dimensions[0],
            groups = groupBy(leaves, (it) => it.get(dim.name)),
            ret = [];

        forEach(groups, (groupLeaves, val) => {
            const id = parentId + Cube.RECORD_ID_DELIMITER + ValueFilter.encode(dim.name, val);

            const newChildren = this.groupAndInsertLeaves(groupLeaves, dimensions.slice(1), aggsAdded, aggsToUpdate, id);
            let rec = _aggMap.get(id);
            if (rec) {
                rec.children = rec.children.concat(newChildren);
                newChildren.forEach(it => it.parent = rec);
                aggsToUpdate.push(rec);
            } else {
                rec = new AggregateRecord(fields, id, newChildren, dim, val);
                aggsAdded.push(rec);
                _aggMap.set(id, rec);
                ret.push(rec);
            }
        });

        return ret;
    }

    loadBoundStore() {
        const {_records, _boundStore: store}  = this;

        if (store) {
            const data = this.getRecordsAsData(_records, true);
            store.loadData(data);
        }
    }


    getRecordsAsData(records, includeChildren) {
        const {_query: q, cube: {_lockFn}} = this;

        if (!records.length || (!q.includeLeaves && records[0].isLeaf)) {
            return [];
        }

        return records.map(rec => {
            let data = clone(rec.data),
                dim = rec.dim,
                children = rec.children;

            if (includeChildren && children) {
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
                const childrenAsData = this.getRecordsAsData(children, includeChildren);
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