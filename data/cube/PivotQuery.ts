/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {appendFilter, FilterLike, parseFilter} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {compact, find, isEmpty, isEqual, isString, uniq} from 'lodash';
import {CubeField} from './CubeField';
import {Query, QueryConfig} from './Query';

/**
 * Extends {@link QueryConfig} with the pivot axis - extra dimensions sliced into *columns* rather
 * than rows, and the measures aggregated at each intersection.
 *
 * `dimensions` keeps its exact existing meaning: the ordered levels of the visible row hierarchy.
 * The two axes are orthogonal and nothing is concatenated.
 *
 * @see PivotQuery
 * @see PivotView
 */
export interface PivotQueryConfig extends QueryConfig {
    /**
     * Pivot dimensions, outermost first. 1 is typical, 3 the practical ceiling. Empty to degenerate
     * to plain View behavior, so apps can toggle pivoting without swapping view objects.
     */
    pivotDimensions?: string[] | CubeField[];

    /**
     * Measures to aggregate per cell. Must specify an aggregator, and must not also be a grouping
     * `dimension`. Derived into `fields` along with their `dependsOn` - see `fields`.
     */
    valueFields: string[] | CubeField[];

    /**
     * *Additional* fields or field names to aggregate, beyond the derived baseline.
     *
     * Unlike {@link QueryConfig.fields}, leaving this unspecified does *not* pull in all
     * {@link Cube.fields}: `dimensions`, `pivotDimensions`, `valueFields`, and the `dependsOn` of
     * those value fields are always derived in, and are all a pivot needs. Each extra aggregatable
     * field named here is aggregated on every row of the hierarchy, so name only what the UI will
     * actually show. Pass `cube.fields` for the plain-Query behavior.
     */
    fields?: string[] | CubeField[];

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

/**
 * {@inheritDoc PivotQueryConfig}
 *
 * @mcpHint query spec for a pivoted Cube view, produced by createPivotView
 */
export class PivotQuery extends Query {
    readonly pivotDimensions: CubeField[];
    readonly valueFields: CubeField[];
    readonly emptyPathLabel: string;
    readonly excludeEmptyPivotValues: boolean;
    readonly maxPivotPaths: number;

    /** Pre-augmentation config, so `clone` re-augments from these rather than compounding. */
    private readonly _preAugmentFields: string[] | CubeField[];
    private readonly _preAugmentFilter: FilterLike;

    constructor(config: PivotQueryConfig) {
        super({
            ...config,
            fields: PivotQuery.augmentFields(config),
            filter: PivotQuery.augmentFilter(config)
        });

        this._preAugmentFields = config.fields;
        this._preAugmentFilter = config.filter;

        const {
            pivotDimensions,
            valueFields,
            emptyPathLabel = '(empty)',
            excludeEmptyPivotValues = false,
            maxPivotPaths = 1000
        } = config;

        this.pivotDimensions = this.parsePivotDimensions(pivotDimensions);
        this.valueFields = this.parseValueFields(valueFields);
        this.emptyPathLabel = emptyPathLabel;
        this.excludeEmptyPivotValues = excludeEmptyPivotValues;
        this.maxPivotPaths = maxPivotPaths;

        this.validate();
    }

    get isPivoted(): boolean {
        return !isEmpty(this.pivotDimensions);
    }

    get pivotDimensionNames(): string[] {
        return this.pivotDimensions.map(it => it.name);
    }

    override equalsExcludingFilter(other: PivotQuery): boolean {
        return (
            super.equalsExcludingFilter(other) &&
            isEqual(this.pivotDimensions, other.pivotDimensions) &&
            isEqual(this.valueFields, other.valueFields) &&
            this.emptyPathLabel === other.emptyPathLabel &&
            this.excludeEmptyPivotValues === other.excludeEmptyPivotValues &&
            this.maxPivotPaths === other.maxPivotPaths
        );
    }

    protected override cloneConfig(overrides: Partial<PivotQueryConfig>): PivotQueryConfig {
        return {
            ...super.cloneConfig(overrides),
            pivotDimensions: this.pivotDimensions,
            valueFields: this.valueFields,
            emptyPathLabel: this.emptyPathLabel,
            excludeEmptyPivotValues: this.excludeEmptyPivotValues,
            maxPivotPaths: this.maxPivotPaths,
            // Raw, not derived: re-deriving from `this.fields` would strand the fields of value
            // fields an override is *replacing*, so a measure picker would accumulate dead
            // aggregations. Before `overrides`, so explicit values still win - super applied them.
            fields: this._preAugmentFields,
            filter: this._preAugmentFilter,
            ...overrides
        };
    }

    //------------------------
    // Implementation
    //------------------------
    private parsePivotDimensions(raw: CubeField[] | string[]): CubeField[] {
        if (isEmpty(raw)) return [];
        if (raw[0] instanceof CubeField) return raw as CubeField[];

        const {fields} = this.cube;
        return (raw as string[]).map(name => {
            const field = find(fields, {name});
            throwIf(
                !field?.isDimension,
                `Pivot dimension '${name}' is not a Field on this Cube, or is not specified with isDimension:true.`
            );
            return field;
        });
    }

    private parseValueFields(raw: CubeField[] | string[]): CubeField[] {
        throwIf(isEmpty(raw), 'PivotQuery requires at least one entry in `valueFields`.');
        if (raw[0] instanceof CubeField) return raw as CubeField[];

        const {fields} = this.cube;
        return (raw as string[]).map(name => {
            const field = find(fields, {name});
            throwIf(!field, `Value field '${name}' is not a Field on this Cube.`);
            return field;
        });
    }

    private validate() {
        const {dimensions, pivotDimensions, valueFields} = this,
            dimNames = (dimensions ?? []).map(it => it.name);

        valueFields.forEach(field => {
            const {name} = field;
            throwIf(!field.aggregator, `Value field '${name}' must specify an aggregator.`);
            // The root path's cell field *is* the bare value field name, so its projection would
            // overwrite the group label a grouping dimension puts in that same slot.
            throwIf(
                dimNames.includes(name),
                `Value field '${name}' cannot also be a grouping dimension of this query.`
            );
        });

        const overlap = pivotDimensions.filter(it => dimNames.includes(it.name));
        throwIf(
            !isEmpty(overlap),
            `Field(s) '${overlap.map(it => it.name)}' cannot be both a grouping and a pivot dimension.`
        );

        // A group node must decompose on exactly one axis. Bucketing leaves leaves an innermost
        // aggregate holding both LeafRows and BucketRows, which would double count on the pivot
        // axis - see the PivotGrid plan doc.
        throwIf(
            this.isPivoted && this.bucketSpecFn && this.includeLeaves,
            'Pivoting is not supported alongside `bucketSpecFn` with `includeLeaves` - bucketing ' +
                'leaves would give a pivot cell two update routes into the same parent.'
        );
    }

    /**
     * Derive the query's full field set - the caller's `fields` plus the pivot dimensions, the value
     * fields, and each value field's `dependsOn`. `Query` folds in `dimensions` on top of this.
     *
     * Note this deliberately does *not* fall back to all `cube.fields` when `fields` is unspecified,
     * as {@link Query} does - see {@link PivotQueryConfig.fields}.
     *
     * Resolved to CubeFields, not names: `Query.parseFields` passes a CubeField[] straight through
     * but re-orders a string[] into Cube field order, which would make the re-augmented `clone`
     * config unequal to its source and defeat `View.updateQuery`'s no-op check. Unknown names are
     * dropped as they are by `parseFields` - `parseValueFields` and `parsePivotDimensions` raise
     * the targeted error.
     */
    private static augmentFields(config: PivotQueryConfig): CubeField[] {
        const {cube, fields, pivotDimensions, valueFields} = config,
            names = [...fieldNames(fields), ...fieldNames(pivotDimensions)];

        fieldNames(valueFields).forEach(name => {
            names.push(name, ...(cube.getField(name)?.dependsOn ?? []));
        });

        return compact(uniq(names).map(name => cube.getField(name)));
    }

    /**
     * Fold `excludeEmptyPivotValues` into the query filter, so exclusion is a real filter.
     *
     * FieldFilters rather than a testFn: `FunctionFilter.equals` compares its `testFn` by reference,
     * so a per-construction closure would make every clone unequal and defeat `View.updateQuery`'s
     * no-op check. FieldFilter treats null / '' / [] alike as blank, matching the intent.
     */
    private static augmentFilter(config: PivotQueryConfig): FilterLike {
        const {filter, excludeEmptyPivotValues, pivotDimensions} = config;
        if (!excludeEmptyPivotValues || isEmpty(pivotDimensions)) return filter;

        const excludes = fieldNames(pivotDimensions).map(field => ({
            field,
            op: '!=' as const,
            value: [null]
        }));

        return appendFilter(parseFilter(filter), ...excludes);
    }
}

//------------------------
// Implementation
//------------------------
function fieldNames(raw: string[] | CubeField[]): string[] {
    return (raw ?? []).map((it: string | CubeField) => (isString(it) ? it : it.name));
}
