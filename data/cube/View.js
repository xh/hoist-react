/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */


import {managed} from '@xh/hoist/core';
import {observable} from '@xh/hoist/mobx';

import {Store} from '../';
import {Cube} from './Cube';
import {ValueFilter} from './filter';
import {AggregateRecord} from './impl/AggregateRecord';

import {isEmpty, groupBy, map, clone} from 'lodash';


/**
 * Primary interface for consuming grouped and aggregated data from the cube.
 */
export class View {

    /**
     * @member {Store} Store with current data in the view.
     */
    @observable
    @managed
    store;

    /** @member {Query} */
    query = null;

    /**
     * @param {Cube} cube - source cube for this view.
     * @param {Query} query - to be used to construct this view,
     * @param {boolean} [connect] - Should this view receive updates when its source Cube changes?
     */
    constructor({query, connect = false}) {
        this.query = query;
        this.store = this.createStore();

        // Connect late to avoid connecting if an exception thrown.
        if (connect) this.cube.connect(this);
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
    //-----------------------
    // Entry point for cube
    //-----------------------
    noteCubeLoaded() {
        this.loadRecordsFromCube();
    }

    //------------------------
    // Implementation
    //------------------------
    createStore() {
        return new Store({fields: this.query.fields});
    }

    async getDataAsync() {
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

        const data = this.getRecordsAsData(newRecords);
        this.store.loadData(data);
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
            {_lockFn} = cube;

        if (!records.length || (!query.includeLeaves && !records[0].isAggregate)) {
            return [];
        }

        return records.map(rec => {
            let {data, dim, children} = rec;

            if (children) {
                // Potentially Lock children
                if (_lockFn && _lockFn(rec)) {
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
            data.xhDimension = dim?.name;
            return data;
        });
    }

    destroy() {
        this.cube.disconnectView(this);
    }
}