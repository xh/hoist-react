/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {
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
import {isString} from 'lodash';

export interface CubeFieldSpec extends FieldSpec {
    /** True to allow this field to be used for grouping.*/
    isDimension?: boolean;

    /** Instance of a Hoist Cube {@link Aggregator} or string token alias for one. */
    aggregator?: Aggregator | AggregatorToken;

    /** Function to determine if aggregation should be performed at a given level of a query result. */
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
 */
export type CanAggregateFn = (dimension: string, value: any, appliedDims: PlainObject) => boolean;

/**
 * Metadata used to define a measure or dimension in Cube. For properties present on raw data source
 * objects to be included in a Cube, the Cube must be configured with a matching Field that tells
 * it to extract the data from the source objects and how to aggregate or filter on that data.
 */
export class CubeField extends Field {
    aggregator: Aggregator;
    canAggregateFn: CanAggregateFn;
    isDimension: boolean;
    isLeafDimension: boolean;
    parentDimension: string;

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
        isDimension = false,
        aggregator = null,
        canAggregateFn = null,
        isLeafDimension = false,
        parentDimension = null,
        ...fieldArgs
    }: CubeFieldSpec) {
        super(fieldArgs);
        this.isDimension = isDimension;

        // Metrics
        this.aggregator = this.parseAggregator(aggregator);
        this.canAggregateFn = canAggregateFn;

        // Dimension specific
        this.isLeafDimension = isLeafDimension;
        this.parentDimension = parentDimension;
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
