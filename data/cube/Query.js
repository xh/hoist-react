/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {ValueFilter} from '@xh/hoist/data/cube';
import {pick, map} from 'lodash';

/**
 *  Specification used to define the shape of data to be consumed from cube.
 *  This is the primary object used to define and alter a View.
 */
export class Query {

    fields = null;           // Map of String (field name) -> Field
    dimensions = null;       // list of Fields on which to group and aggregate
    filters = null;          // list of Filters
    includeRoot = false;     // Include a root aggregate in results
    includeLeaves = false;   // Include leaves in results
    cube = null;             // Associated cube

    /**
     * @param {String[]} [fields] - field names. Default of null to include all available fields.
     * @param {String[]} [dimensions] - field names to group on. All entries must be in fields, above.
     *                    Default of null will skip grouping.
     * @param {Filter[]} [filters] - Filters (or configs for such) to be applied
     * @param {boolean} [includeRoot] - True to include a synthetic root node with global aggregates for this view.
     * @param {boolean} [includeLeaves] - True to include leaf nodes in results.
     * @param {Cube} cube - associated cube, required.
     *
     * Note that if no dimensions are provided, either 'includeRoot', or 'includeLeaves' should be true.
     * Otherwise no data will be returned by this view.
     */
    constructor({
        fields = null,
        dimensions = null,
        filters = null,
        includeRoot = false,
        includeLeaves = false,
        cube
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
            dimensions: this.getDimensionNames(),
            fields: this.getFieldNames(),
            filters: this.filters,
            includeRoot: this.includeRoot,
            includeLeaves: this.includeLeaves,
            cube: this.cube,
            ...overrides
        };

        return new Query(conf);
    }

    getFieldNames() {
        return map(this.fields, f => f.name);
    }

    getDimensionNames() {
        const {dimensions} = this;
        return dimensions ? dimensions.map(f => f.name) : [];
    }

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

    //---------------------------
    // Implementation
    //---------------------------
    parseFields(names) {
        const {fields} = this.cube;
        return names ? pick(fields, names)  :  fields;
    }

    parseDimensions(names) {
        if (!names) return null;
        return names.map(name => {
            const field = this.fields[name];
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