/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {
    BucketSpecFn,
    Filter,
    FilterLike,
    FilterTestFn,
    LockFn,
    OmitFn,
    parseFilter,
    StoreRecord
} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {find, isEqual} from 'lodash';
import {Cube} from './Cube';
import {CubeField} from './CubeField';

/**
 * Queries determine what data is extracted, grouped, and aggregated from a {@link Cube}.
 */
export interface QueryConfig {
    /**
     * The Cube to query. Required, but note that the preferred {@link Cube.executeQuery} API will
     * install a reference to itself on the query config (automatically).
     */
    cube?: Cube;

    /**
     * Fields or field names. If unspecified will include all available {@link Cube.fields}.
     * Specify a subset to optimize aggregation performance.
     */
    fields?: string[] | CubeField[];

    /**
     * Fields or field names on which data should be grouped and aggregated. These are the ordered
     * grouping levels in the resulting hierarchy - e.g. ['Country', 'State', 'City'].
     *
     * Any fields provided here must also be included in the `fields` array, if specified.
     *
     * If not provided or empty, the resulting data will not be grouped. Specify 'includeRoot' or
     * 'includeLeaves' in that case, otherwise no data will be returned.
     */
    dimensions?: string[] | CubeField[];

    /**
     * Filters to apply to leaf data, or configs to create. Note that leaf data will be filtered
     * and then aggregated - i.e. the filters provided here will filter in/out the lowest level
     * facts and _won't_ operate directly on any aggregates.
     *
     * Arrays will be combined into a single 'AND' CompoundFilter.
     */
    filter?: FilterLike;

    /**
     * True to include a synthetic root node in the return with grand totals (aggregations across
     * all data returned by the query). Pairs well with {@link StoreConfig.loadRootAsSummary} and
     * {@link GridConfig.showSummary} to display a docked grand total row for grids rendering
     * Cube results.
     */
    includeRoot?: boolean;

    /**
     * True to include leaf nodes (the "flat" facts originally loaded into the Cube) as the
     * {@link ViewRowData.children} of the lowest level of aggregated `dimensions`.
     *
     * False (the default) to only return aggregate rows based on requested `dimensions`.
     *
     * Useful when you wish to e.g. load Cube results into a tree grid and allow users to expand
     * aggregated groups all the way out to see the source data. See also `provideLeaves`, which
     * will provide access to these nodes without exposing as `children`.
     */
    includeLeaves?: boolean;

    /**
     * True to provide access to leaf nodes via the {@link ViewRowData.cubeLeaves} getter on the
     * lowest level of aggregated `dimensions`. This will allow programmatic access to the leaves
     * used to produce a given aggregation, without exposing them as `children` in a way that would
     * cause them to be rendered in a tree grid.
     *
     * Useful when e.g. a full leaf-level drill-down is not desired, but the app still needs
     * access to those leaves to display in a separate view or for further processing.
     *
     * See also the more common `includeLeaves`.
     */
    provideLeaves?: boolean;

    /**
     * True (default) to recursively omit single-child parents in the hierarchy.
     * Apps can implement further omit logic using `omitFn`.
     */
    omitRedundantNodes?: boolean;

    /**
     * Optional function to be called for each aggregate node to determine if it should be "locked",
     * preventing drill-down into its children.
     *
     * Defaults to {@link Cube.lockFn}.
     */
    lockFn?: LockFn;

    /**
     * Optional function to be called for each dimension during row generation to determine if the
     * children of that dimension should be bucketed into additional dynamic dimensions.
     *
     * This can be used to break selected aggregations into sub-groups dynamically, without having
     * to define another dimension in the Cube and have it apply to all aggregations. See the
     * {@link BucketSpec} interface for additional information.
     *
     * Defaults to {@link Cube.bucketSpecFn}.
     */
    bucketSpecFn?: BucketSpecFn;

    /**
     * Optional function to be called on all single child rows during view processing.
     * Return true to omit the row. Defaults to Cube.omitFn.
     */
    omitFn?: OmitFn;
}

/** {@inheritDoc QueryConfig} */
export class Query {
    readonly fields: CubeField[];
    readonly dimensions: CubeField[];
    readonly filter: Filter;
    readonly hasFilter: boolean;
    readonly includeRoot: boolean;
    readonly includeLeaves: boolean;
    readonly provideLeaves: boolean;
    readonly omitRedundantNodes: boolean;
    readonly cube: Cube;
    readonly lockFn: LockFn;
    readonly bucketSpecFn: BucketSpecFn;
    readonly omitFn: OmitFn;

    private readonly _testFn: FilterTestFn;

    constructor({
        cube,
        fields,
        dimensions,
        filter = null,
        includeRoot = false,
        includeLeaves = false,
        provideLeaves = false,
        omitRedundantNodes = true,
        lockFn = cube.lockFn,
        bucketSpecFn = cube.bucketSpecFn,
        omitFn = cube.omitFn
    }: QueryConfig) {
        this.cube = cube;
        this.fields = this.parseFields(fields);
        this.dimensions = this.parseDimensions(dimensions);
        this.includeRoot = includeRoot;
        this.includeLeaves = includeLeaves;
        this.provideLeaves = provideLeaves;
        this.omitRedundantNodes = omitRedundantNodes;
        this.filter = parseFilter(filter);
        this.lockFn = lockFn;
        this.bucketSpecFn = bucketSpecFn;
        this.omitFn = omitFn;

        this._testFn = this.filter?.getTestFn(this.cube.store) ?? null;
        this.hasFilter = this._testFn != null;
    }

    clone(overrides: Partial<QueryConfig>) {
        const conf = {
            dimensions: this.dimensions,
            fields: this.fields,
            filter: this.filter,
            includeRoot: this.includeRoot,
            includeLeaves: this.includeLeaves,
            provideLeaves: this.provideLeaves,
            omitRedundantNodes: this.omitRedundantNodes,
            lockFn: this.lockFn,
            bucketSpecFn: this.bucketSpecFn,
            omitFn: this.omitFn,
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
     * True if the provided other Query is equivalent to this instance, not considering the filter.
     */
    equalsExcludingFilter(other: Query): boolean {
        return (
            isEqual(this.fields, other.fields) &&
            isEqual(this.dimensions, other.dimensions) &&
            this.cube === other.cube &&
            this.includeRoot === other.includeRoot &&
            this.includeLeaves === other.includeLeaves &&
            this.provideLeaves === other.provideLeaves &&
            this.omitRedundantNodes === other.omitRedundantNodes &&
            this.bucketSpecFn == other.bucketSpecFn &&
            this.omitFn == other.omitFn &&
            this.lockFn == other.lockFn
        );
    }

    //------------------------
    // Implementation
    //------------------------
    private parseFields(raw: CubeField[] | string[]): CubeField[] {
        const {fields} = this.cube;
        if (!raw) return fields;
        if (raw[0] instanceof CubeField) return raw as CubeField[];
        const names = raw as String[];
        return fields.filter(f => names.includes(f.name));
    }

    private parseDimensions(raw: CubeField[] | string[]): CubeField[] {
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
