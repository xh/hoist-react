/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Filter, Cube} from '@xh/hoist/data/cube';
import {castArray, flattenDeep, keyBy, uniq, map, forEach} from 'lodash';

export class ValueFilter extends Filter {

    static encode(fieldName, values) {
        // e.g.   assetClass=[FX]   -or-   animal=[dog||cat||bear]
        return fieldName + '=[' + castArray(values).join('||') + ']';
    }

    static decode(str) {
        const parts = str.split('='),
            fieldName = parts[0],
            values = parts[1].replace(/^\[|]$/g, '').split('||');

        return new ValueFilter(fieldName, values);
    }

    // Decode a collection of ValueFilters from an aggregate record (by parsing its ID)
    static fromRecord(record) {
        return record.id
            .split(Cube.constructor.RECORD_ID_DELIMITER)
            .slice(1) // first component in ID path is "root"
            .map(it => ValueFilter.decode(it));
    }

    // Decode and union a de-duplicated set of ValueFilters from a collection of aggregate records.
    static fromRecords(records) {
        records = castArray(records);

        const recFilters = records.map(rec => ValueFilter.fromRecord(rec));
        return ValueFilter.union(recFilters);
    }

    // Union multiple ValueFilters, ensuring one filter per field containing all distinct values for that field.
    static union(filters) {
        filters = flattenDeep(filters);

        const byName = keyBy(filters, 'fieldName'),
            ret = [];

        forEach(byName, (fieldFilters, fieldName) => {
            const fieldVals = uniq(flattenDeep(map(fieldFilters, 'values')));
            ret.push(new ValueFilter(fieldName, fieldVals));
        });

        return ret;
    }

    constructor(fieldName, values) {
        super();
        this.fieldName = fieldName;
        this.values = castArray(values);
    }

    matches(record) {
        return this.values.includes(record.get(this.fieldName));
    }

    toString() {
        return ValueFilter.encode(this.fieldName, this.values);
    }
}