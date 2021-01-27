/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
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

    static averageAggregator = new AverageAggregator();
    static averageStrictAggregator = new AverageStrictAggregator();
    static maxAggregator = new MaxAggregator();
    static minAggregator = new MinAggregator();
    static nullAggregator = new NullAggregator();
    static singleAggregator = new SingleAggregator();
    static sumAggregator = new SumAggregator();
    static sumStrictAggregator = new SumStrictAggregator();
    static uniqueAggregator = new UniqueAggregator();

    /** @param {CubeFieldConfig} c */
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
                case 'AVG':             return CubeField.averageAggregator;
                case 'AVG_STRICT':      return CubeField.averageStrictAggregator;
                case 'MAX':             return CubeField.maxAggregator;
                case 'MIN':             return CubeField.minAggregator;
                case 'NULL':            return CubeField.nullAggregator;
                case 'SINGLE':          return CubeField.singleAggregator;
                case 'SUM':             return CubeField.sumAggregator;
                case 'SUM_STRICT':      return CubeField.sumStrictAggregator;
                case 'UNIQUE':          return CubeField.uniqueAggregator;
            }
        }
        if (val instanceof Aggregator) return val;
        return null;
    }
}

/**
 * @typedef {Object} CubeFieldConfig - extends {@see FieldConfig} with cube-specific configs.
 * @property {string} name - unique key representing this field.
 * @property {FieldType} [type] - default `FieldType.AUTO` indicates no conversion.
 * @property {string} [displayName] - user-facing / longer name for display, defaults to `name`
 *      transformed via `genDisplayName()` (e.g. 'myField' -> 'My Field').
 * @property {*} [defaultValue] - value to be used for records with a null, or non-existent value.
 * @property {boolean} [c.isDimension] - true to allow this field to be used for grouping.
 * @property {(Aggregator|string)} [c.aggregator] - instance of a Hoist Cube Aggregator (from the
 *      aggregate package), or string alias for the same (e.g. 'MAX').
 * @property {CanAggregateFn} [c.canAggregateFn] - function to determine if aggregation
 *      should be performed at any given level of a query result.
 * @property {boolean} [c.isLeafDimension] - true if any further groupings below this dimension
 *      would be derivative (have only one member).
 * @property {?string} [c.parentDimension] - name of field that is a 'parent' dimension of this
 *      dimension. This marks this dimension as a sub-dimension of the parent dimension
 *      (e.g. 'asset group' and 'asset').  This will allow the Cube view to skip creating
 *      derivative nodes when a parent node has a single identical child node.
 */

/**
 * @callback CanAggregateFn
 * @param {string} dimension - dimension of aggregation
 * @param {*} value - value of record on dimension
 * @param {Object} - *all* applied dimension values for this record
 * @returns boolean
 */
