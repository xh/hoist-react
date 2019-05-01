/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {ValueFilter} from '@xh/hoist/data/cube';
import {values} from 'lodash';

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
     * Create this object.
     *
     * @param fields, array of field names. Default of null to include all available fields.
     * @param dimensions, array of field names. All entries must be in fields, above.
     *                    Default of null will skip grouping.
     * @param filters, array of Filter (or configs for such)
     * @param includeRoot, boolean.  True to include a synthetic Root nodes with global aggregates for this view.
     * @param includeLeaves, boolean.  True to include leaf nodes in results.
     * @param cube, associated cube, required.
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
        return values(this.fields).map(f => f.name);
    }

    getDimensionNames() {
        return this.dimensions ? this.dimensions.map(f => f.name) : [];
    }

    filtersAsString() {
        let ret = 'root';
        if (this.filters) {
            this.filters.forEach(it => {
                ret += '>>' + it.toString();
            });
        }
        return ret;
    }

    //---------------------------
    // Implementation
    //---------------------------
    parseFields(names) {
        const cubeFields = this.cube.fields;
        if (!names) return cubeFields;
        const ret = {};
        names.forEach(name => {
            const field = cubeFields[name];
            if (!field) {
                throw XH.exception(`Unknown or incorrect field: '${name}'`);
            }
            ret[name] = field;
        });
        return ret;
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
        return filters.map(f => {
            // TODO - support other filter subclasses here
            return f instanceof ValueFilter ? f : new ValueFilter(f.name, f.values);
        });
    }
}