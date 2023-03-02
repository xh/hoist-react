/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {Filter, parseFilter, StoreRecord} from '@xh/hoist/data';
import {isEqual, find} from 'lodash';
import {FilterLike, FilterTestFn} from '../filter/Types';
import {CubeField} from './CubeField';
import {Cube} from './Cube';
import {throwIf} from '@xh/hoist/utils/js';

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
     * Fields or field names. If unspecified will include all available fields
     * from the source Cube, otherwise supply a subset to optimize aggregation performance.
     */
    fields?: string[]|CubeField[];

    /**
     * Fields or field names to group on. Any fields provided must also be in fields config, above. If none
     * given the resulting data will not be grouped.
     */
    dimensions?: string[]|CubeField[];

    /**
     * One or more filters or configs to create one.  If an array, a single 'AND' filter will
     * be created.
     */
    filter?: FilterLike;

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

    readonly fields: CubeField[];
    readonly dimensions: CubeField[];
    readonly filter: Filter;
    readonly includeRoot: boolean;
    readonly includeLeaves: boolean;
    readonly cube: Cube;

    private readonly _testFn: FilterTestFn;

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
            dimensions: this.dimensions,
            fields: this.fields,
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
            this.equalsExcludingFilter(other) &&
            ((!this.filter && !other.filter) || this.filter?.equals(other.filter))
        );
    }

    /**
     * True if the provided other Query is equivalent to this instance,
     * not considering the filter.
     */
    equalsExcludingFilter(other: Query): boolean {
        return (
            isEqual(this.fields, other.fields) &&
            isEqual(this.dimensions, other.dimensions) &&
            this.cube === other.cube &&
            this.includeRoot === other.includeRoot &&
            this.includeLeaves === other.includeLeaves
        );
    }

    //------------------------
    // Implementation
    //------------------------
    private parseFields(raw: CubeField[]|string[]): CubeField[] {
        const {fields} = this.cube;
        if (!raw) return fields;
        if (raw[0] instanceof CubeField) return raw as CubeField[];
        const names = raw as String[];
        return fields.filter(f => names.includes(f.name));
    }

    private parseDimensions(raw: CubeField[]|string[]): CubeField[] {
        if (!raw) return null;
        if (raw[0] instanceof CubeField) return raw as CubeField[];
        const {fields} = this;
        return raw.map(name => {
            const field = find(fields, {name});
            throwIf(
                !field?.isDimension,
                `Dimension '${name}' is not a Field on this Cube, or is not specified with isDimension:true.`
            );
            return field;
        });
    }
}
