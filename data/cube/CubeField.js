/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {isString} from 'lodash';
import {
    Aggregator,
    Field,
    MaxAggregator,
    MinAggregator,
    NullAggregator,
    SingleAggregator,
    SumAggregator,
    SumStrictAggregator,
    UniqueAggregator,
    AverageAggregator,
    AverageStrictAggregator
} from '@xh/hoist/data';

/**
 * Metadata used to define a measure or dimension in Cube. For properties present on raw data source
 * objects to be included in a Cube, the Cube must be configured with a matching Field that tells
 * it to extract the data from the source objects and how to aggregate or filter on that data.
 */
export class CubeField extends Field {

    /** @member {Aggregator} */
    aggregator;
    /** @member {CanAggregateFn} */
    canAggregateFn;
    /** @member {boolean} */
    isDimension;
    /** @member {boolean} */
    isLeafDimension;
    /** @member {string} */
    parentDimension;

    static maxAggregator = new MaxAggregator();
    static minAggregator = new MinAggregator();
    static nullAggregator = new NullAggregator();
    static sumAggregator = new SumAggregator();
    static sumStrictAggregator = new SumStrictAggregator();
    static uniqueAggregator = new UniqueAggregator();
    static singleAggregator = new SingleAggregator();
    static averageAggregator = new AverageAggregator();
    static averageStrictAggregator = new AverageStrictAggregator();

    /**
     * @param {Object} c - Field configuration.  See Field class for core parameters.
     *      This constructor also supports the additional parameters below.
     * @param {boolean} [c.isDimension] - true to allow this field to be used for grouping.
     * @param {(string|Aggregator)} [c.aggregator] - instance of a Hoist Cube Aggregator (from the
     *      aggregate package), or string alias for the same (e.g. 'MAX').
     * @param {CanAggregateFn} [c.canAggregateFn] - function to determine if aggregation
     *      should be performed at any given level of a query result.
     * @param {boolean} [c.isLeafDimension] - true if any further groupings below this dimension
     *      would be derivative (have only one member).
     * @param {string?} [c.parentDimension] - name of field that is a 'parent' dimension of this
     *      dimension. This marks this dimension as a sub-dimension of the parent dimension
     *      (e.g. 'asset group' and 'asset').  This will allow the Cube view to skip creating
     *      derivative nodes when a parent node has a single identical child node.
     */
    constructor({
        isDimension = false,
        aggregator = null,
        canAggregateFn =  null,
        isLeafDimension = false,
        parentDimension = null,
        ...fieldArgs
    }) {
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
    parseAggregator(val) {
        if (isString(val)) {
            switch (val) {
                case 'MAX':             return CubeField.maxAggregator;
                case 'MIN':             return CubeField.minAggregator;
                case 'NULL':            return CubeField.nullAggregator;
                case 'SUM':             return CubeField.sumAggregator;
                case 'SUM_STRICT':      return CubeField.sumStrictAggregator;
                case 'UNIQUE':          return CubeField.uniqueAggregator;
                case 'SINGLE':          return CubeField.singleAggregator;
                case 'AVERAGE':         return CubeField.averageAggregator;
                case 'AVERAGE_STRICT':  return CubeField.averageStrictAggregator;
            }
        }
        if (val instanceof Aggregator) return val;
        return null;
    }
}


/**
 * @callback CanAggregateFn
 *
 * @param {string} dimension - dimension of aggregation
 * @param {*} value - value of record on dimension
 * @param {Object} - *all* applied dimension values for this record
 * @returns boolean
 */
