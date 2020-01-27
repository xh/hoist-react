/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {
    Aggregator,
    MaxAggregator,
    MinAggregator,
    NullAggregator,
    SumAggregator,
    SumStrictAggregator,
    UniqueAggregator,
    SingleAggregator

} from './aggregate';

import {isString} from 'lodash';
import {Field} from 'store';

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

    /**
     * @param {Object} c - Field configuration.  See Field class for core parameters.
     *      The CubeField constructor also supports the additional parameters below.
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
        aggregator = isDimension ? null : Field.uniqueAggregator,
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
                case 'MAX':         return CubeField.maxAggregator;
                case 'MIN':         return CubeField.minAggregator;
                case 'NULL':        return CubeField.nullAggregator;
                case 'SUM':         return CubeField.sumAggregator;
                case 'SUM_STRICT':  return CubeField.sumStrictAggregator;
                case 'UNIQUE':      return CubeField.uniqueAggregator;
                case 'SINGLE':      return CubeField.singleAggregator;
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
 * @param {Object} - previously applied dimension values for this record
 */
