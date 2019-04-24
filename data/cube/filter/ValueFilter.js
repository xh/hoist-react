/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Filter} from '@xh/hoist/data/cube/filter/Filter';
import {castArray, flattenDeep, keyBy, unique, map} from 'lodash';

export class ValueFilter extends Filter {

    constructor(fieldName, values) {
        super();
        this.fieldName = fieldName;
        this.values = castArray(values);
    }

    encode(fieldName, values) {
        // e.g.   assetClass=[FX]   -or-   animal=[dog||cat||bear]
        return fieldName + '=[' + castArray(values).join('||') + ']';
    }

    decode(str) {
        const parts = str.split('='),
            fieldName = parts[0],
            values = parts[1].replace(/^\[|]$/g, '').split('||');

        return new XH.cube.filter.ValueFilter(fieldName, values);
    }

    // Decode a collection of ValueFilters from an aggregate record (by parsing its ID)
    fromRecord(record) {
        return record.id
            .split(XH.cube.Cube.RECORD_ID_DELIMITER)
            .slice(1) // first component in ID path is "root"
            .map(it => XH.cube.filter.ValueFilter.decode(it));
    }

    // Decode and union a de-duplicated set of ValueFilters from a collection of aggregate records.
    fromRecords(records) {
        records = castArray(records);

        const recFilters = records.map(rec => XH.cube.filter.ValueFilter.fromRecord(rec));
        return XH.cube.filter.ValueFilter.union(recFilters);
    }

    // Union multiple ValueFilters, ensuring one filter per field containing all distinct values for that field.
    union(filters) {
        filters = flattenDeep(filters);

        const byName = keyBy(filters, 'fieldName'),
            ret = [];

        forEach(byName, (fieldName, fieldFilters) => {
            const fieldVals = unique(flattenDeep(map(fieldFilters, 'values')));
            ret.push(new XH.cube.filter.ValueFilter(fieldName, fieldVals));
        });

        return ret;
    }

    matches(record) {
        return this.values.includes(record.get(this.fieldName));
    }

    toString() {
        return XH.cube.filter.ValueFilter.encode(this.fieldName, this.values);
    }

}