/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH, ManagedSupport} from '@xh/hoist/core';
import {parseFilter} from '../filter/Utils';
import {castArray, find} from 'lodash';
import {apiRemoved} from '@xh/hoist/utils/js';

/**
 *  Specification used to define the shape of the data returned by a Cube.
 */
@ManagedSupport
export class Query {

    /** @member {CubeField[]} */
    fields;
    /** @member {CubeField[]} */
    dimensions;
    /** @member {Filter} */
    filter;
    /** @member {boolean} */
    includeRoot;
    /** @member {boolean} */
    includeLeaves;
    /** @member {Cube} */
    cube;


    /**
     * @param {Object} c - Query configuration.
     * @param {Cube} c.cube - associated Cube. Required, but note that `Cube.executeQuery()` will
     *      install a reference to itself on the query config automatically.
     * @param {string[]} [c.fields] - field names. If unspecified will include all available fields
     *      from the source Cube, otherwise supply a subset to optimize aggregation performance.
     * @param {string[]} [c.dimensions] - field names to group on. Any fields provided must also be
     *      in fields config, above. If none given the resulting data will not be grouped.
     * @param {(Filter|*|*[])} [c.filter] - one or more filters or configs to create one.  If an
     *      array, a single 'AND' filter will be created.
     * @param {boolean} [c.includeRoot] - true to include a synthetic root node in the return with
     *      grand total aggregate values.
     * @param {boolean} [c.includeLeaves] - true to include leaf nodes in return.
     *
     * Note that if no dimensions are provided, 'includeRoot' or 'includeLeaves' should be true.
     * Otherwise no data will be returned by this view!
     */
    constructor({
        cube,
        fields,
        dimensions,
        filter = null,
        includeRoot = false,
        includeLeaves = false
    }) {
        apiRemoved(this.filters, 'filters', 'Use filter instead.');

        this.cube = cube;
        this.fields = this.parseFields(fields);
        this.dimensions = this.parseDimensions(dimensions);
        this.includeRoot = includeRoot;
        this.includeLeaves = includeLeaves;
        this.filter = parseFilter(filter);

        this._testFn = this.filter?.getTestFn(this.cube.store) ?? null;
    }

    clone(overrides) {
        const conf = {
            dimensions: this.dimensions?.map(d => d.name),
            fields: this.fields?.map(f => f.name),
            filter: this.filter,
            includeRoot: this.includeRoot,
            includeLeaves: this.includeLeaves,
            cube: this.cube,
            ...overrides
        };

        return new Query(conf);
    }

    /** @return {string} */
    static filterAsString(filter) {
        const {field, op, value} = filter;
        return `${field}${op}[${castArray(value).join('||')}]`;
    }

    /** @returns {string} */
    filtersAsString() {
        const {filter} = this;
        let ret = 'root';
        if (filter) ret += '>>' + Query.filterAsString(filter);
        return ret;
    }

    /**
     * @param {Record} record
     * @returns {boolean}
     */
    test(record) {
        return this._testFn ? this._testFn(record) : true;
    }

    //------------------------
    // Implementation
    //------------------------
    parseFields(names) {
        const {fields} = this.cube.store;
        return names ? fields.filter(f => names.includes(f.name)) : fields;
    }

    parseDimensions(names) {
        if (!names) return null;
        const {fields} = this;
        return names.map(name => {
            const field = find(fields, {name});
            if (!field || !field.isDimension) {
                throw XH.exception(`Dimension '${name}' is not a Field on this Cube, or is not specified with isDimension:true.`);
            }
            return field;
        });
    }
}
