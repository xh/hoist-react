/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Cube} from './Cube';
import {ValueFilter} from './filter';
import {AggregateRecord} from './impl/AggregateRecord';

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
     * @private.  Applications should use createView() instead.
     *
     * @param {Query} query - query to be used to construct this view,
     * @param {Store} [store] - store into which data for this view should be loaded.
     *      This store is optional, if this view is *only* being used to produce
     *      raw data it need not be provided.
     */
    constructor(query, store) {
        this.query = query;
    }

    //--------------------
    // Main Public API
    //--------------------
    get cube() {
        return this.query.cube;
    }

    isConnected() {
        return this.cube.isConnected(this);
    }

    getInfo() {
        return this.cube.getInfo();
    }

    getData() {
        const {query} = this,
            {dimensions, includeRoot, fields, cube, filters} = query,
            cubeRecords = cube.store.records,
            rootId = query.filtersAsString();

        const leaves = !isEmpty(filters) ?
            cubeRecords.filter(rec => filters.every(f => f.fn(rec))) :
            cubeRecords;

        let newRecords = this.groupAndInsertLeaves(leaves, dimensions, rootId, {});
        newRecords = includeRoot ?
            [new AggregateRecord(fields, rootId, newRecords, null, 'Total', {})] :
            newRecords;

        return this.getRecordsAsData(newRecords);
    }

    //-----------------------
    // Entry point for cube
    //-----------------------
    noteCubeLoaded() {}
    noteCubeUpdated() {}

    //------------------------
    // Implementation
    //------------------------
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
            if (!rec.isAggregate) return {id, ...data};

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
                data.xhDimension = dim?.name;
            }

            return data;
        });
    }

    destroy() {
        this.cube.disconnectView(this);
    }
}