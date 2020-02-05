/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Cube} from './Cube';
import {ValueFilter} from './filter';

import {AggregateRecord} from './impl/AggregateRecord';
import {RecordSet} from '../impl/RecordSet';

import {isEmpty, groupBy, map, omitBy} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Primary interface for consuming grouped and aggregated data from the cube.
 *
 * Not created directly by application.  Applications should use the method
 * Cube.createView() instead.
 */
export class View {

    /** @member {Query} */
    query = null;

    /** @member {Store} */
    store = null;

    // Implementation
    lastLeaves  = null; // RecordSet

    /**
     * @private.  Applications should use createView() instead.
     *
     * @param {Query} query - query to be used to construct this view,
     */
    constructor(query) {
        this.query = query;
    }

    //--------------------
    // Main Public API
    //--------------------
    get cube() {
        return this.query.cube;
    }

    get info() {
        return this.cube.info();
    }

    getData() {
        throwIf(this.isConnected, 'getData() is for use on unconnected stores only.');
        return this.generateData();
    }

    connect(store) {
        this.store = store;
        this.reloadStore();
        this.cube._connectedViews.add(this);
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
        this.reloadStore();
    }

    noteCubeUpdated(transaction) {
        const t = this.filteredTransaction(transaction);

        // 0) Need a full rebuild, due to changed leaves
        if (!isEmpty(t.add) || !isEmpty(t.remove) || !isEmpty(t.newUpdate)) {
            this.reloadStore();
            return;
        }

        // 1) Otherwise, incrementally refresh aggregations.  Hopefully common!
        if (!isEmpty(t.update)) {
            console.debug('ToDo:  Apply these updates minimally:');
            console.debug(t);
            this.reloadStore();
        }
    }


    //------------------------
    // Implementation
    //------------------------
    reloadStore() {
        const {store} = this;
        if (store) store.loadData(this.generateData());
    }


    // Generate a new full data representation
    generateData() {
        const {query} = this,
            {dimensions, includeRoot, fields, cube} = query,
            rootId = query.filtersAsString();

        const leaves = this.filterLeaves(cube.store._current);

        let newRecords = this.groupAndInsertLeaves(leaves.list, dimensions, rootId, {});
        newRecords = includeRoot ?
            [new AggregateRecord(fields, rootId, newRecords, null, 'Total', {})] :
            newRecords;

        const ret = this.getRecordsAsData(newRecords);

        this.currLeaves = leaves;
        return ret;
    }


    groupAndInsertLeaves(leaves, dimensions, parentId, appliedDimensions) {
        if (isEmpty(dimensions)) return leaves;

        const {query} = this,
            {fields} = query,
            dim = dimensions[0],
            dimName = dim.name,
            groups = groupBy(leaves, (it) => it.data[dimName]);

        appliedDimensions = {...appliedDimensions};
        return map(groups, (groupLeaves, val) => {
            appliedDimensions[dimName] = val;
            const id = parentId + Cube.RECORD_ID_DELIMITER + ValueFilter.encode(dimName, val);
            const newChildren = this.groupAndInsertLeaves(groupLeaves, dimensions.slice(1), id, appliedDimensions);
            return new AggregateRecord(fields, id, newChildren, dim, val, appliedDimensions);
        });
    }

    getRecordsAsData(records) {
        const {query, cube} = this,
            {lockFn} = cube;

        if (!records.length || (!query.includeLeaves && !records[0].isAggregate)) {
            return [];
        }

        return records.map(rec => {
            let {id, data, dim, children} = rec;

            // Leaves are simple
            if (!rec.isAggregate) return {id: id, cubeLabel: id, ...data};

            // Aggregates need children and their dimension processed.
            if (children) {
                // Potentially Lock children
                if (lockFn && lockFn(rec)) {
                    data.locked = true;
                    children = [];
                } else if (children.length === 1) {
                    // ...or drill past single child if it is an identical 'child' dimension.
                    const childRec = children[0],
                        childDim = childRec.dim;

                    if (dim && childDim && childDim.parentDimension === dim.name &&
                        childRec.data[childDim.name] === rec.data[dim.name]) {
                        children = childRec.children;
                    }
                }

                // 1) serialize to store data recursively
                const childrenAsData = this.getRecordsAsData(children);
                if (childrenAsData.length) {
                    data.children = childrenAsData;
                }
            }
            if (dim) {
                data.cubeDimension = dim?.name;
            }

            return data;
        });
    }

    filteredTransaction(t) {
        const {filters} = this.query;
        if (isEmpty(filters)) return t;

        const {currLeaves} = this,
            recordFilter = (r) => filters.every(f => f.fn(r));
        return omitBy({
            update: t.update?.filter(r => currLeaves.getById(r.id)),
            remove: t.remove?.filter(id => currLeaves.getById(id)),
            add:    t.add?.filter(recordFilter),
            newUpdate: t.update?.filter(r => !currLeaves.getById(r.id) && recordFilter(r))
        }, isEmpty);
    }

    filterLeaves(rs) {
        const {filters} = this.query;
        if (isEmpty(filters)) return rs;

        const passes = new Map();
        rs.recordMap.forEach((rec, key) => {
            if (filters.every(f => f.fn(rec))) passes.set(key, rec);
        });
        return new RecordSet(rs.store, passes);
    }

    destroy() {
        this.disconnect();
    }
}