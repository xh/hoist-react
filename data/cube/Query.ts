/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {
    appendFilter,
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
import {compact, find, isEmpty, isEqual, sortBy, uniq} from 'lodash';
import {Cube} from './Cube';
import {CubeField} from './CubeField';

/**
 * Queries determine what data is extracted, grouped, and aggregated from a {@link Cube}.
 * Passed via the `query` property of {@link ViewConfig} when creating a View.
 *
 * Key options beyond `dimensions` and `filter`: `includeRoot` adds a grand-total row,
 * `includeLeaves` exposes source records as tree children, and `provideLeaves` makes them
 * accessible programmatically without rendering in the tree. `pivot` additionally slices the
 * aggregates across a second axis of dimensions - see {@link PivotSpec}.
 *
 * See the Cube package README (`data/cube/README.md#querying-with-views`) for query patterns.
 *
 * @see Cube
 * @see View
 */
export interface QueryConfig {
    /**
     * The Cube to query. Required, but note that the preferred {@link Cube.executeQuery} API will
     * install a reference to itself on the query config (automatically).
     */
    cube?: Cube;

    /**
     * Fields or field names. If unspecified will include all available {@link Cube.fields}.
     * Specify a subset to optimize aggregation performance. `dimensions` and any `pivot` fields
     * are always included.
     */
    fields?: string[] | CubeField[];

    /**
     * Fields or field names on which data should be grouped and aggregated. These are the ordered
     * grouping levels in the resulting hierarchy - e.g. ['Country', 'State', 'City'].
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
     * True to provide access to leaf nodes via the {@link getCubeLeaves} helper on the
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
     * {@link BucketSpecFn} type and {@link BucketSpec} interface for additional information.
     *
     * Defaults to {@link Cube.bucketSpecFn}.
     */
    bucketSpecFn?: BucketSpecFn;

    /**
     * Optional function to be called on all single child rows during view processing.
     * Return true to omit the row. Defaults to Cube.omitFn.
     */
    omitFn?: OmitFn;

    /**
     * Pivot additional dimensions into *columns* rather than rows, aggregating measures at each
     * intersection. Omit for an ordinary view - see {@link PivotSpec}.
     */
    pivot?: PivotSpec;
}

/**
 * Pivot axis of a {@link QueryConfig} - extra dimensions sliced into columns rather than rows,
 * and the measures aggregated at each intersection.
 *
 * `QueryConfig.dimensions` keeps its exact meaning as the ordered levels of the visible row
 * hierarchy. The two axes are orthogonal and nothing is concatenated. Results carry the pivot
 * structure as {@link ViewResult.paths} and {@link ViewResult.cellFields}, with each cell value
 * published as a synthetic field on its group row's {@link ViewRowData} - see `PivotGridModel`
 * for the component that renders them.
 */
export interface PivotSpec {
    /**
     * Pivot dimensions, outermost first. 1 is typical, 3 the practical ceiling. Empty to degenerate
     * to plain View behavior, so apps can toggle pivoting without swapping view objects.
     */
    dimensions: string[] | CubeField[];

    /**
     * Measures to aggregate per cell. Must specify an aggregator, and must not also be a grouping
     * `dimension`. Added to the query's `fields` along with any {@link Aggregator.dependsOn}.
     */
    valueFields: string[] | CubeField[];

    /** Label for a null / blank pivot dimension value. Default '(empty)'. */
    emptyPathLabel?: string;

    /**
     * True to exclude records with a null / blank pivot dimension value entirely. Default false,
     * which gives such records their own `emptyPathLabel` path segment instead.
     *
     * Implemented as an implicit filter, so excluded records leave the *group* aggregates too. That
     * is the only formulation under which a row total still equals the sum of its pivot columns.
     */
    excludeEmptyPivotValues?: boolean;

    /** Throw if the discovered pivot path count exceeds this. Default 1000; null to disable. */
    maxPivotPaths?: number;
}

/** Resolved form of a {@link PivotSpec}, as held by a {@link Query}. */
export interface Pivot {
    dimensions: CubeField[];
    dimensionNames: string[];
    valueFields: CubeField[];
    emptyPathLabel: string;
    excludeEmptyPivotValues: boolean;
    maxPivotPaths: number;
}

/**
 * {@inheritDoc QueryConfig}
 *
 * @mcpHint query spec against a Cube, produced by executeQuery / createView
 */
export class Query {
    /**
     * Queried fields, sorted by name. Includes `dimensions` and pivot fields, added here if not
     * already present.
     */
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
    /** Resolved pivot spec, or null for an ordinary query. */
    readonly pivot: Pivot;

    // Pre-derivation inputs, so `clone` re-derives from these rather than compounding.
    private readonly _rawFields: string[] | CubeField[];
    private readonly _rawFilter: Filter;
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
        omitFn = cube.omitFn,
        pivot = null
    }: QueryConfig) {
        this.cube = cube;
        this._rawFields = fields?.slice();
        this._rawFilter = parseFilter(filter);
        this.dimensions = this.parseDimensions(dimensions);
        this.pivot = this.parsePivot(pivot);
        // Ensure canonical field order so equivalent queries compare equal
        this.fields = sortBy(
            uniq([...this.parseFields(fields), ...(this.dimensions ?? []), ...this.pivotFields()]),
            'name'
        );
        this.includeRoot = includeRoot;
        this.includeLeaves = includeLeaves;
        this.provideLeaves = provideLeaves;
        this.omitRedundantNodes = omitRedundantNodes;
        this.filter = this.applyPivotFilter(this._rawFilter);
        this.lockFn = lockFn;
        this.bucketSpecFn = bucketSpecFn;
        this.omitFn = omitFn;

        this._testFn = this.filter?.getTestFn(this.cube.store) ?? null;
        this.hasFilter = this._testFn != null;

        this.validatePivot();
    }

    clone(overrides: Partial<QueryConfig>): Query {
        return new Query({
            dimensions: this.dimensions,
            fields: this._rawFields, // NOT this.fields - would retain stale dimensions
            filter: this._rawFilter, // NOT this.filter - would re-append any pivot exclusion
            includeRoot: this.includeRoot,
            includeLeaves: this.includeLeaves,
            provideLeaves: this.provideLeaves,
            omitRedundantNodes: this.omitRedundantNodes,
            lockFn: this.lockFn,
            bucketSpecFn: this.bucketSpecFn,
            omitFn: this.omitFn,
            pivot: this.pivot,
            cube: this.cube,
            ...overrides
        });
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
            isEqual(this.pivot, other.pivot) &&
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

    /**
     * True if a change from `other` to this query can leave cached parent rows unused - i.e. it moves
     * the ids those rows are generated under, so retaining them would keep values that no later
     * generation maintains. See {@link RowCache}.
     * @internal
     */
    orphansParents(other: Query): boolean {
        return (
            !isEqual(this.dimensions, other.dimensions) ||
            // Cell row ids are keyed on pivot path, and path keys carry dimension *values* alone -
            // so a pivot dimension change can even land a stale cell on a live id.
            !isEqual(this.pivot?.dimensions, other.pivot?.dimensions)
        );
    }

    /**
     * True if a change from `other` to this query leaves cached parent rows holding state it no longer
     * asks for - so they must be rebuilt rather than recomputed in place. See {@link RowCache}.
     * @internal
     */
    invalidatesParents(other: Query): boolean {
        return (
            this.bucketSpecFn !== other.bucketSpecFn ||
            // Cell rows aggregate `valueFields` alone, so a measure change moves a field set that
            // `fields` - and with it RowCache's own field-gain check - can miss entirely.
            !isEqual(this.pivot?.valueFields, other.pivot?.valueFields)
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
        if (raw[0] instanceof CubeField) return raw.slice() as CubeField[]; // force clone, we retain.
        const {fields} = this.cube;
        return raw.map(name => {
            const field = find(fields, {name});
            throwIf(
                !field?.isDimension,
                `Dimension '${name}' is not a Field on this Cube, or is not specified with isDimension:true.`
            );
            return field;
        });
    }

    //------------------------
    // Pivot
    //------------------------
    /** True if this query pivots on at least one dimension. */
    get isPivoted(): boolean {
        return !isEmpty(this.pivot?.dimensions);
    }

    private parsePivot(spec: PivotSpec): Pivot {
        if (!spec) return null;

        const {
                dimensions,
                valueFields,
                emptyPathLabel = '(empty)',
                excludeEmptyPivotValues = false,
                maxPivotPaths = 1000
            } = spec,
            dims = this.parseDimensions(dimensions) ?? [];

        return {
            dimensions: dims,
            dimensionNames: dims.map(it => it.name),
            valueFields: this.parseValueFields(valueFields),
            emptyPathLabel,
            excludeEmptyPivotValues,
            maxPivotPaths
        };
    }

    private parseValueFields(raw: CubeField[] | string[]): CubeField[] {
        throwIf(isEmpty(raw), 'A pivot requires at least one entry in `valueFields`.');
        if (raw[0] instanceof CubeField) return raw.slice() as CubeField[]; // force clone, we retain.

        const {fields} = this.cube;
        return (raw as string[]).map(name => {
            const field = find(fields, {name});
            throwIf(!field, `Value field '${name}' is not a Field on this Cube.`);
            return field;
        });
    }

    /** The pivot's own fields plus anything their aggregators read - always queried. */
    private pivotFields(): CubeField[] {
        const {pivot, cube} = this;
        if (!pivot) return [];

        const deps = pivot.valueFields.flatMap(f => f.aggregator?.dependsOn ?? []);
        return [
            ...pivot.dimensions,
            ...pivot.valueFields,
            ...compact(deps.map(n => cube.getField(n)))
        ];
    }

    /**
     * Fold `excludeEmptyPivotValues` into the query filter, so exclusion is a real filter.
     *
     * FieldFilters rather than a testFn: `FunctionFilter.equals` compares its `testFn` by reference,
     * so a per-construction closure would make every clone unequal and defeat `View.updateQuery`'s
     * no-op check. FieldFilter treats null / '' / [] alike as blank, matching the intent.
     */
    private applyPivotFilter(filter: Filter): Filter {
        const {pivot} = this;
        if (!pivot?.excludeEmptyPivotValues || !this.isPivoted) return filter;

        const excludes = pivot.dimensionNames.map(field => ({
            field,
            op: '!=' as const,
            value: [null]
        }));
        return appendFilter(filter, ...excludes);
    }

    private validatePivot() {
        const {pivot} = this;
        if (!pivot) return;

        const dimNames = (this.dimensions ?? []).map(it => it.name);

        pivot.valueFields.forEach(field => {
            const {name} = field;
            throwIf(!field.aggregator, `Pivot value field '${name}' must specify an aggregator.`);
            // The root path's cell field *is* the bare value field name, so its projection would
            // overwrite the group label a grouping dimension puts in that same slot.
            throwIf(
                dimNames.includes(name),
                `Pivot value field '${name}' cannot also be a grouping dimension of this query.`
            );
        });

        const overlap = pivot.dimensionNames.filter(it => dimNames.includes(it));
        throwIf(
            !isEmpty(overlap),
            `Field(s) '${overlap}' cannot be both a grouping and a pivot dimension.`
        );

        // A group node must decompose on exactly one axis. Bucketing leaves leaves an innermost
        // aggregate holding both LeafRows and BucketRows, which would double count on the pivot
        // axis - see `PivotStructure`.
        throwIf(
            this.isPivoted && this.bucketSpecFn && this.includeLeaves,
            'Pivoting is not supported alongside `bucketSpecFn` with `includeLeaves` - bucketing ' +
                'leaves would give a pivot cell two update routes into the same parent.'
        );
    }
}
