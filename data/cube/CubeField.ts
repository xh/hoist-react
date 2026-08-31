/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {
    AggregationContext,
    Aggregator,
    AverageAggregator,
    AverageStrictAggregator,
    ChildCountAggregator,
    Field,
    FieldSpec,
    LeafCountAggregator,
    MaxAggregator,
    MinAggregator,
    NullAggregator,
    SingleAggregator,
    SumAggregator,
    SumStrictAggregator,
    UniqueAggregator
} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {isString} from 'lodash';
import type {ViewRowData} from './ViewRowData';

export interface CubeFieldSpec extends FieldSpec {
    /** Instance of a Hoist Cube {@link Aggregator} or string token alias for one. */
    aggregator?: Aggregator | AggregatorToken;

    /**
     * Function computing this field's value at read time from a View row's other values and the
     * View's {@link AggregationContext} - the Cube-layer form of the calculated field concept
     * introduced by {@link FieldSpec.calculatedFn}, with a widened signature.
     *
     * Calculated values are read through lazy prototype getters on the {@link ViewRowData}
     * objects a View publishes - computed fresh on every read, never stored or aggregated.
     * Because such fields carry no aggregator, they never disqualify a View from its incremental
     * data-only update path - the recommended way to express globally-dependent values like
     * percent-of-total, in place of an eagerly-computed aggregator reading beyond its own
     * children:
     *
     * ```ts
     * {
     *     name: 'pctCommission',
     *     calculatedFn: (row, ctx) => {
     *         const total = sumBy(ctx.filteredRecords, r => r.data.commission);
     *         return total ? (row.commission / total) * 100 : null;
     *     }
     * }
     * ```
     *
     * Note when the needed global is already published as a row - e.g. a View with `includeRoot`
     * loading a store with `loadRootAsSummary` - prefer a Store-layer `calculatedFn` reading
     * `store.summaryRecords`, requiring no Cube API at all. Use this Cube-layer form when the
     * global is not published as a row, reading `ctx.filteredRecords` and memoizing per-tick
     * intermediates in `ctx.appData`.
     *
     * As at the Store layer ({@link FieldSpec.calculatedFn}), values are read by name and are
     * invisible to own-property enumeration, and fns should prefer returning primitives or
     * stable references - a fresh object or array per read defeats the value-equality check
     * grids use to skip repainting unchanged cells.
     *
     * Mutually exclusive with `aggregator`, `canAggregateFn` and `isDimension`. Calculated
     * fields may not feed other aggregators or appear in a {@link BucketSpec}'s
     * `dependentFields`, and stores connected to a View with calculated fields must set
     * {@link StoreConfig.projectionOnly}.
     */
    calculatedFn?: CubeCalculatedFn;

    /**
     * Function to determine if aggregation should be performed at a given level of a query result.
     *
     * Evaluated when a row is built and re-evaluated on each subsequent query result for rows
     * that are reused - so may depend on the current {@link AggregationContext} as well as on its
     * first three args. Values are recomputed for any field whose eligibility changes as a result.
     */
    canAggregateFn?: CanAggregateFn;

    /** True if any further groupings below this dimension would be derivative (have only one member). */
    isLeafDimension?: boolean;

    /**
     * Name of field that is a 'parent' dimension of this dimension. This marks this dimension as a
     * sub-dimension of the parent dimension (e.g. 'asset group' and 'asset'). This allows the view
     * to skip creating derivative nodes when a parent node has a single identical child node.
     */
    parentDimension?: string;
}

/** Convenient (and serializable) alias for one of Hoist's Cube {@link Aggregator} classes. */
export type AggregatorToken =
    | 'AVG'
    | 'AVG_STRICT'
    | 'CHILD_COUNT'
    | 'LEAF_COUNT'
    | 'MAX'
    | 'MIN'
    | 'NULL'
    | 'SINGLE'
    | 'SUM'
    | 'SUM_STRICT'
    | 'UNIQUE';

/**
 * @param dimension - dimension of aggregation
 * @param value - value of record on dimension
 * @param appliedDims - *all* applied dimension values for this record
 * @param context - current aggregation context
 */
export type CanAggregateFn = (
    dimension: string,
    value: any,
    appliedDims: PlainObject,
    context: AggregationContext
) => boolean;

/**
 * Function computing a Cube-layer calculated field value at read time.
 * See {@link CubeFieldSpec.calculatedFn}.
 */
export type CubeCalculatedFn = (row: ViewRowData, context: AggregationContext) => any;

/**
 * Metadata used to define a measure or dimension in Cube. For properties present on raw data source
 * objects to be included in a Cube, the Cube must be configured with a matching Field that tells
 * it to extract the data from the source objects and how to aggregate or filter on that data.
 *
 * @mcpHint field with aggregation metadata for use within a Cube
 */
export class CubeField extends Field {
    aggregator: Aggregator;
    canAggregateFn: CanAggregateFn;
    isLeafDimension: boolean;
    parentDimension: string;

    override get isCubeField() {
        return true;
    }

    /** See {@link CubeFieldSpec.calculatedFn} - Cube-layer signature. */
    declare calculatedFn: CubeCalculatedFn;

    static averageAggregator = new AverageAggregator();
    static averageStrictAggregator = new AverageStrictAggregator();
    static childCountAggregator = new ChildCountAggregator();
    static leafCountAggregator = new LeafCountAggregator();
    static maxAggregator = new MaxAggregator();
    static minAggregator = new MinAggregator();
    static nullAggregator = new NullAggregator();
    static singleAggregator = new SingleAggregator();
    static sumAggregator = new SumAggregator();
    static sumStrictAggregator = new SumStrictAggregator();
    static uniqueAggregator = new UniqueAggregator();

    constructor({
        aggregator = null,
        canAggregateFn = null,
        isLeafDimension = false,
        parentDimension = null,
        calculatedFn = null,
        ...fieldArgs
    }: CubeFieldSpec) {
        super(fieldArgs);

        // Metrics
        this.aggregator = this.parseAggregator(aggregator);
        this.canAggregateFn = canAggregateFn;

        // Dimension specific
        this.isLeafDimension = isLeafDimension;
        this.parentDimension = parentDimension;

        // Calculated - carries the widened Cube-layer signature, assigned post-super.
        this.calculatedFn = calculatedFn;
        throwIf(
            calculatedFn && (this.aggregator || this.canAggregateFn || this.isDimension),
            `CubeField '${this.name}' may not combine 'calculatedFn' with 'aggregator', 'canAggregateFn', or 'isDimension' - calculated values are computed at read time, never aggregated or grouped on.`
        );
    }

    //------------------------
    // Implementation
    //------------------------
    private parseAggregator(val: Aggregator | AggregatorToken): Aggregator {
        if (isString(val)) {
            switch (val) {
                case 'AVG':
                    return CubeField.averageAggregator;
                case 'AVG_STRICT':
                    return CubeField.averageStrictAggregator;
                case 'CHILD_COUNT':
                    return CubeField.childCountAggregator;
                case 'LEAF_COUNT':
                    return CubeField.leafCountAggregator;
                case 'MAX':
                    return CubeField.maxAggregator;
                case 'MIN':
                    return CubeField.minAggregator;
                case 'NULL':
                    return CubeField.nullAggregator;
                case 'SINGLE':
                    return CubeField.singleAggregator;
                case 'SUM':
                    return CubeField.sumAggregator;
                case 'SUM_STRICT':
                    return CubeField.sumStrictAggregator;
                case 'UNIQUE':
                    return CubeField.uniqueAggregator;
            }
        }
        if (val instanceof Aggregator) return val;
        return null;
    }
}
