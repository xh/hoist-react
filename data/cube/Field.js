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
    
} from './aggregate';

import {isString, startCase} from 'lodash';

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
     * @param {Object} c - Field configuration.
     * @param {string} c.name - Unique key describing this field.
     * @param {string} [c.displayName] - Descriptive name suitable for display to end users.
     * @param {(string|Aggregator)} [c.aggregator] - instance of a Hoist Cube Aggregator (from the
     *      aggregate package), or string alias for the same (e.g. 'MAX').
     * @param {boolean} [c.isDimension] - true to allow this field to be used for grouping.
     * @param {boolean} [c.isLeafDimension] - true if any further groupings below this dimension
     *      would be derivative (have only one member).
     * @param {string} [c.parentDimension] - name of field that is a 'parent' dimension of this
     *      dimension. This marks this dimension as a sub-dimension of the parent dimension
     *      (e.g. 'asset group' and 'asset').  This will allow the Cube view to skip creating
     *      derivative nodes when a parent node has a single identical child node.
     */
    constructor({
        name,
        displayName,
        aggregator,
        isDimension = false,
        isLeafDimension = false,
        parentDimension = null
    }) {
        this.name = name;
        this.displayName = displayName || startCase(name);
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
                case 'MAX':         return Field.maxAggregator;
                case 'MIN':         return Field.minAggregator;
                case 'NULL':        return Field.nullAggregator;
                case 'SUM':         return Field.sumAggregator;
                case 'SUM_STRICT':  return Field.sumStrictAggregator;
                case 'UNIQUE':      return Field.uniqueAggregator;
                case 'SINGLE':      return Field.singleAggregator;
            }
        }
        if (val instanceof Aggregator) return val;
        return Field.uniqueAggregator;
    }
}