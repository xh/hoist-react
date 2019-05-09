/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {ValueFilter} from '@xh/hoist/data/cube';

/**
 *  Specification used to define the shape of the data returned by a Cube.
 */
export class Query {

    /** @member {Map} */
    fields;
    /** @member {Field[]} */
    dimensions;
    /** @member {ValueFilter[]} */
    filters;
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
     * @param {string[]} [c.fields] - field names. Default of null to include all available fields
     *      from the source Cube, or supply a subset to optimize aggregation performance.
     * @param {string[]} [c.dimensions] - field names to group on. Any fields provided must also be
     *      in fields config, above. Default of null will skip grouping.
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
        fields = null,
        dimensions = null,
        filters = null,
        includeRoot = false,
        includeLeaves = false
    }) {
        this.cube = cube;
        this.fields = this.parseFields(fields);
        this.dimensions = this.parseDimensions(dimensions);
        this.filters = this.parseFilters(filters);
        this.includeRoot = includeRoot;
        this.includeLeaves = includeLeaves;
    }

    clone(overrides) {
        const conf = {
            dimensions: this.dimensionNames,
            fields: this.fieldNames,
            filters: this.filters,
            includeRoot: this.includeRoot,
            includeLeaves: this.includeLeaves,
            cube: this.cube,
            ...overrides
        };

        return new Query(conf);
    }

    /** @returns {string[]} */
    get fieldNames() {
        return Array.from(this.fields.keys());
    }

    /** @returns {string[]} */
    get dimensionNames() {
        const {dimensions} = this;
        return dimensions ? dimensions.map(f => f.name) : [];
    }

    /** @returns {string} */
    filtersAsString() {
        const {filters} = this;
        let ret = 'root';
        if (filters) {
            filters.forEach(it => {
                ret += '>>' + it.toString();
            });
        }
        return ret;
    }


    //------------------------
    // Implementation
    //------------------------
    parseFields(names) {
        const fields = this.cube.fields;
        if (!names) return fields;

        const ret = new Map();
        fields.forEach((v, k) => {
            if (names.includes(k)) ret.set(k, v);
        });

        return ret;
    }

    parseDimensions(names) {
        if (!names) return null;
        return names.map(name => {
            const field = this.fields.get(name);
            if (!field || !field.isDimension) {
                throw XH.exception(`Dimension is not a field, or is not a field specified as dimension '${name}'`);
            }
            return field;
        });
    }

    parseFilters(filters) {
        if (!filters) return null;
        return filters.map(f => f instanceof ValueFilter ? f : new ValueFilter(f.name, f.values));
    }
}