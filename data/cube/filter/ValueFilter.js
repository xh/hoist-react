/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

//= require Filter.js

Ext.define('XH.cube.filter.ValueFilter', {
    extends: XH.cube.filter.Filter,

    statics: {
        encode(fieldName, values) {
            // e.g.   assetClass=[FX]   -or-   animal=[dog||cat||bear]
            return fieldName + '=[' + Ext.Array.from(values).join('||') + ']';
        },

        decode(str) {
            const parts = str.split('='),
                fieldName = parts[0],
                values = parts[1].replace(/^\[|]$/g, '').split('||');

            return new XH.cube.filter.ValueFilter(fieldName, values);
        },

        // Decode a collection of ValueFilters from an aggregate record (by parsing its ID)
        fromRecord(record) {
            return record.id
                .split(XH.cube.Cube.RECORD_ID_DELIMITER)
                .slice(1) // first component in ID path is "root"
                .map(it => XH.cube.filter.ValueFilter.decode(it));
        },

        // Decode and union a de-duplicated set of ValueFilters from a collection of aggregate records.
        fromRecords(records) {
            records = Ext.Array.from(records);

            const recFilters = records.map(rec => XH.cube.filter.ValueFilter.fromRecord(rec));
            return XH.cube.filter.ValueFilter.union(recFilters);
        },

        // Union multiple ValueFilters, ensuring one filter per field containing all distinct values for that field.
        union(filters) {
            const ARR = Ext.Array;

            filters = ARR.flatten(filters);

            const byName = ARR.toValueMap(filters, 'fieldName', 1),
                ret = [];

            Ext.Object.each(byName, (fieldName, fieldFilters) => {
                const fieldVals = ARR.unique(ARR.flatten(ARR.pluck(fieldFilters, 'values')));
                ret.push(new XH.cube.filter.ValueFilter(fieldName, fieldVals));
            });

            return ret;
        }
    },

    constructor(fieldName, values) {
        this.fieldName = fieldName;
        this.values = Ext.Array.from(values);
    },

    matches(record) {
        return this.values.includes(record.get(this.fieldName));
    },

    toString() {
        return XH.cube.filter.ValueFilter.encode(this.fieldName, this.values);
    }

});