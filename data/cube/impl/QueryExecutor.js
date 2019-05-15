/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {
    Cube,
    AggregateCubeRecord,
    ValueFilter
} from '@xh/hoist/data/cube';
import {isEmpty, groupBy, clone, map} from 'lodash';
import {wait} from '@xh/hoist/promise';

/**
 * @private
 */
export class QueryExecutor {

    static async getDataAsync(query) {
        const {dimensions, includeRoot, fields, cube, filters} = query,
            cubeRecords = cube.records,
            rootId = query.filtersAsString();

        const leaves = !isEmpty(filters) ?
            cubeRecords.filter(rec => filters.every(f => f.matches(rec))) :
            cubeRecords;

        await wait(1);

        let newRecords = this.groupAndInsertLeaves(query, leaves, dimensions, rootId, {});
        newRecords = includeRoot ?
            [new AggregateCubeRecord(fields, rootId, newRecords, null, 'Total')] :
            newRecords;

        await wait(1);
        return this.getRecordsAsData(query, newRecords);
    }

    //-----------------
    // Implementation
    //-----------------
    static groupAndInsertLeaves(query, leaves, dimensions, parentId, appliedDimensions) {
        if (isEmpty(dimensions)) return leaves;

        const {fields} = query,
            dim = dimensions[0],
            groups = groupBy(leaves, (it) => it.get(dim.name));

        const childAppliedDimensions = {...dimensions};
        return map(groups, (groupLeaves, val) => {
            childAppliedDimensions[dim] = val;
            const id = parentId + Cube.RECORD_ID_DELIMITER + ValueFilter.encode(dim.name, val);
            const newChildren = this.groupAndInsertLeaves(query, groupLeaves, dimensions.slice(1), id, childAppliedDimensions);
            return new AggregateCubeRecord(fields, id, newChildren, dim, val, appliedDimensions);
        });
    }

    static getRecordsAsData(q, records) {
        const {_lockFn} = q.cube;

        if (!records.length || (!q.includeLeaves && records[0].isLeaf)) {
            return [];
        }

        return records.map(rec => {
            let data = rec.isLeaf ? clone(rec.data) : rec.data,
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