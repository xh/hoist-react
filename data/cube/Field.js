/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


/**
 * Metadata used to define a measure or dimension in XH.cube.Cube.
 */
Ext.define('XH.cube.Field', {

    name: null,
    displayName: null,
    aggregator: null,
    isDimension: false,
    isLeafDimension: false,
    parentDimension: null,

    /**
     * Construct this object.
     *
     * @param name, string. Unique key describing this field.
     * @param displayName, string. Descriptive name suitable for display to end users.
     * @param aggregator, XH.cube.aggregate.Aggregator, or alias for Hoist aggregators in XH.cube.aggregate package (e.g. 'MAX').
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
    },

    //---------------------------
    // Implementation
    //---------------------------
    parseAggregator(val) {
        const AG = XH.cube.aggregate;
        if (Ext.isString(val)) {
            switch (val) {
                case 'MAX':         return AG.Max;
                case 'MIN':         return AG.Min;
                case 'NULL':        return AG.Null;
                case 'SUM':         return AG.Sum;
                case 'SUM_STRICT':  return AG.SumStrict;
                case 'UNIQUE':      return AG.Unique;
                case 'SINGLE':      return AG.Single;
            }
        }
        if (val instanceof AG.Aggregator) return val;
        return AG.Unique;
    }
});