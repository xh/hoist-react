/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
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
    
} from '@xh/hoist/data/cube';

import {isString} from 'lodash';

/**
 * Metadata used to define a measure or dimension in Cube.
 */
export class Field {

    name = null;
    displayName = null;
    aggregator = null;
    isDimension = false;
    isLeafDimension = false;
    parentDimension = null;

    static maxAggregator = new MaxAggregator();
    static minAggregator = new MinAggregator();
    static nullAggregator = new NullAggregator();
    static sumAggregator = new SumAggregator();
    static sumStrictAggregator = new SumStrictAggregator();
    static uniqueAggregator = new UniqueAggregator();
    static singleAggregator = new SingleAggregator();


    /**
     * Construct this object.
     *
     * @param name, string. Unique key describing this field.
     * @param displayName, string. Descriptive name suitable for display to end users.
     * @param aggregator, Aggregator, or alias for Hoist aggregators in aggregate package (e.g. 'MAX').
     * @param isDimension, boolean. True to allow this field to be used for groupings and aggregations.
     * @param isLeafDimension, boolean. True if any further groupings below this dimension would be derivative (have only one member).
     * @param parentDimension, name of field that is a 'parent' dimension of this dimension. This marks this dimension as a
     *              sub-dimension of the parent dimension (e.g. 'asset group' and 'asset').  This will allow the Cube
     *              view to skip creating derivative nodes when a parent node has a single identical child node.
     **/
    constructor({
        name,
        displayName,
        aggregator,
        isDimension = false,
        isLeafDimension = false,
        parentDimension = null
    }) {
        this.name = name;
        this.displayName = displayName || name;
        this.aggregator = this.parseAggregator(aggregator);
        this.isDimension = isDimension;
        this.isLeafDimension = isLeafDimension;
        this.parentDimension = parentDimension;
    }

    //---------------------------
    // Implementation
    //---------------------------
    parseAggregator(val) {
        if (isString(val)) {
            switch (val) {
                case 'MAX':         return this.maxAggregator;
                case 'MIN':         return this.minAggregator;
                case 'NULL':        return this.nullAggregator;
                case 'SUM':         return this.sumAggregator;
                case 'SUM_STRICT':  return this.sumStrictAggregator;
                case 'UNIQUE':      return this.uniqueAggregator;
                case 'SINGLE':      return this.singleAggregator;
            }
        }
        if (val instanceof Aggregator) return val;
        return UniqueAggregator;
    }
}