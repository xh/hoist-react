/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH, ManagedSupport, managed} from '@xh/hoist/core';
import {FilterModel} from '@xh/hoist/data';
import {castArray, find} from 'lodash';

/**
 *  Specification used to define the shape of the data returned by a Cube.
 */
@ManagedSupport
export class Query {

    /** @member {CubeField[]} */
    fields;
    /** @member {CubeField[]} */
    dimensions;
    /** @member {boolean} */
    includeRoot;
    /** @member {boolean} */
    includeLeaves;
    /** @member {Cube} */
    cube;

    @managed
    _filterModel;

    /** @member {Filter[]} */
    get filters() {
        return this._filterModel.filters;
    }

    /**
     * @param {Object} c - Query configuration.
     * @param {Cube} c.cube - associated Cube. Required, but note that `Cube.executeQuery()` will
     *      install a reference to itself on the query config automatically.
     * @param {string[]} [c.fields] - field names. If unspecified will include all available fields
     *      from the source Cube, otherwise supply a subset to optimize aggregation performance.
     * @param {string[]} [c.dimensions] - field names to group on. Any fields provided must also be
     *      in fields config, above. If none given the resulting data will not be grouped.
     * @param {(Filter[]|Object[])} [c.filters] - Filters (or configs for such) to be applied
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
        filters = null,
        includeRoot = false,
        includeLeaves = false
    }) {
        this.cube = cube;
        this.fields = this.parseFields(fields);
        this.dimensions = this.parseDimensions(dimensions);
        this.includeRoot = includeRoot;
        this.includeLeaves = includeLeaves;

        this._filterModel = new FilterModel(filters);
    }

    clone(overrides) {
        const conf = {
            dimensions: this.dimensions?.map(d => d.name),
            fields: this.fields?.map(f => f.name),
            filters: this.filters,
            includeRoot: this.includeRoot,
            includeLeaves: this.includeLeaves,
            cube: this.cube,
            ...overrides
        };

        return new Query(conf);
    }

    /** @return {string} */
    static filterAsString(filter) {
        const {field, operator, value} = filter;
        return `${field}${operator}[${castArray(value).join('||')}]`;
    }

    /** @returns {string} */
    filtersAsString() {
        const {filters} = this;
        let ret = 'root';
        if (filters) {
            filters.forEach(it => {
                ret += '>>' + Query.filterAsString(it);
            });
        }
        return ret;
    }

    /**
     * @param {Record} record
     * @returns {boolean}
     */
    test(record) {
        return this._filterModel.test(record);
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
