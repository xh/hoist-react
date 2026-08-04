/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {find, isEmpty, isEqual, isString} from 'lodash';
import {CubeField} from './CubeField';
import {Query, QueryConfig} from './Query';

/**
 * Extends {@link QueryConfig} with the pivot axis - extra dimensions sliced into *columns* rather
 * than rows, and the measures aggregated at each intersection.
 *
 * `dimensions` keeps its exact existing meaning: the ordered levels of the visible row hierarchy.
 * The two axes are orthogonal and nothing is concatenated.
 *
 * See the Cube package README (`data/cube/README.md`) for pivot patterns.
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

    /** Measures to aggregate per cell. Must be aggregatable members of `fields`. */
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

    constructor(config: PivotQueryConfig) {
        super({...config, filter: PivotQuery.augmentFilter(config)});

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
        const {fields, dimensions, pivotDimensions, valueFields} = this,
            fieldNames = fields.map(it => it.name);

        valueFields.forEach(field => {
            const {name} = field;
            throwIf(
                !fieldNames.includes(name),
                `Value field '${name}' must be included in the query's \`fields\`.`
            );
            throwIf(!field.aggregator, `Value field '${name}' must specify an aggregator.`);
            throwIf(field.isDimension, `Value field '${name}' cannot be a dimension.`);
        });

        const dimNames = (dimensions ?? []).map(it => it.name),
            overlap = pivotDimensions.filter(it => dimNames.includes(it.name));
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

    /** Fold `excludeEmptyPivotValues` into the query filter, so exclusion is a real filter. */
    private static augmentFilter(config: PivotQueryConfig) {
        const {filter, excludeEmptyPivotValues, pivotDimensions} = config;
        if (!excludeEmptyPivotValues || isEmpty(pivotDimensions)) return filter;

        const names = (pivotDimensions as any[]).map(it => (isString(it) ? it : it.name)),
            exclude = {
                key: 'excludeEmptyPivotValues',
                testFn: rec => names.every(name => rec.data[name] != null && rec.data[name] !== '')
            };

        return isEmpty(filter) ? exclude : [].concat(filter as any, exclude);
    }
}
