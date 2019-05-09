/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {
    Cube,
    AggregateCubeRecord,
    CubeRecord,
    ValueFilter
} from '@xh/hoist/data/cube';
import {isEmpty, groupBy, clone, map} from 'lodash';


/**
 * @private
 */
export class QueryExecutor {

    static getData(query) {
        const {dimensions, includeRoot, fields, cube} = query,
            {records} = cube,
            sourceRecords = Array.from(records.values()),
            rootId = query.filtersAsString();

        // Create the new structure
        let newLeaves = this.createLeaves(query, sourceRecords),
            newRecords = this.groupAndInsertLeaves(query, newLeaves, dimensions, rootId);

        newRecords = includeRoot ?
            [new AggregateCubeRecord(fields, rootId, newRecords, null, 'Total')] :
            newRecords;

        return this.getRecordsAsData(query, newRecords);
    }

    //-----------------
    // Implementation
    //-----------------
    static createLeaves(query, sourceRecords) {
        const {filters, fields} = query;

        // 0) Filter source records
        if (filters && filters.length) {
            sourceRecords = sourceRecords.filter(rec => filters.every(f => f.matches(rec)));
        }

        // 1) Create and store cloned leaves.
        return sourceRecords.map(r => new CubeRecord(fields, r.data, r.id));
    }

    static groupAndInsertLeaves(query, leaves, dimensions, parentId) {
        if (!dimensions || isEmpty(dimensions)) return leaves;

        const {fields} = query,
            dim = dimensions[0],
            groups = groupBy(leaves, (it) => it.get(dim.name));

        return map(groups, (groupLeaves, val) => {
            const id = parentId + Cube.RECORD_ID_DELIMITER + ValueFilter.encode(dim.name, val);
            const newChildren = this.groupAndInsertLeaves(query, groupLeaves, dimensions.slice(1), id);
            return new AggregateCubeRecord(fields, id, newChildren, dim, val);
        });
    }

    static getRecordsAsData(q, records) {
        const {_lockFn} = q.cube;

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
                const childrenAsData = this.getRecordsAsData(q, children);
                if (childrenAsData.length) {
                    data.children = childrenAsData;
                }
            }
            data.xhDimension = dim ? dim.name : null;
            return data;
        });
    }
}