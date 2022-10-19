/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {Filter, parseFilter, StoreRecord} from '@xh/hoist/data';
import {isEqual, find} from 'lodash';
import {FilterLike, FilterTestFn} from '../filter/Types';
import {CubeField} from './CubeField';
import {Cube} from './Cube';

/**
 * Queries determine what data is extracted from a cube and how it should be grouped + aggregated.
 *
 * Note that if no dimensions are provided, 'includeRoot' or 'includeLeaves' should be true -
 * otherwise no data will be returned!
 */
export interface QueryConfig {
    /**
     * Associated Cube. Required, but note that `Cube.executeQuery()` will install a reference to
     * itself on the query config (automatically)
     */
    cube?: Cube;

    /**
     * Field names. If unspecified will include all available fields
     * from the source Cube, otherwise supply a subset to optimize aggregation performance.
     */
    fields?: string[];

    /**
     * Field names to group on. Any fields provided must also be in fields config, above. If none
     * given the resulting data will not be grouped.
     */
    dimensions?: string[];

    /**
     * One or more filters or configs to create one.  If an array, a single 'AND' filter will
     * be created.
     */
    filter?: FilterLike

    /**
     * IncludeRoot?: True to include a synthetic root node in the return with grand total
     * aggregate values.
     */
    includeRoot?: boolean;

    /** True to include leaf nodes in return.*/
    includeLeaves?: boolean;
}

/** {@inheritDoc QueryConfig} */
export class Query {

    fields: CubeField[];
    dimensions: CubeField[];
    filter: Filter;
    includeRoot: boolean;
    includeLeaves: boolean;
    cube: Cube;

    private _testFn: FilterTestFn;

    constructor({
        cube,
        fields,
        dimensions,
        filter = null,
        includeRoot = false,
        includeLeaves = false
    }: QueryConfig) {
        this.cube = cube;
        this.fields = this.parseFields(fields);
        this.dimensions = this.parseDimensions(dimensions);
        this.includeRoot = includeRoot;
        this.includeLeaves = includeLeaves;
        this.filter = parseFilter(filter);

        this._testFn = this.filter?.getTestFn(this.cube.store) ?? null;
    }

    clone(overrides: Partial<QueryConfig>) {
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

    test(record: StoreRecord): boolean {
        return this._testFn ? this._testFn(record) : true;
    }

    /**
     * True if the provided other Query is equivalent to this instance.
     */
    equals(other: Query): boolean {
        if (other === this) return true;
        return (
            isEqual(this.cube, other.cube) &&
            isEqual(this.fields, other.fields) &&
            isEqual(this.dimensions, other.dimensions) &&
            ((!this.filter && !other.filter) || this.filter?.equals(other.filter)) &&
            this.includeRoot === other.includeRoot &&
            this.includeLeaves === other.includeLeaves
        );
    }

    //------------------------
    // Implementation
    //------------------------
    private parseFields(names: string[]): CubeField[] {
        const {fields} = this.cube;
        return names ? fields.filter(f => names.includes(f.name)) : fields;
    }

    private parseDimensions(names: string[]): CubeField[] {
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
