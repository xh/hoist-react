/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Cube} from '@xh/hoist/data/cube';
import {Filter} from './Filter';
import {castArray, flattenDeep, groupBy, uniq, map, forEach} from 'lodash';

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
            .split(Cube.RECORD_ID_DELIMITER)
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

        const byName = groupBy(filters, 'fieldName'),
            ret = [];

        forEach(byName, (fieldFilters, fieldName) => {
            const fieldVals = uniq(flattenDeep(map(fieldFilters, 'values')));
            ret.push(new ValueFilter(fieldName, fieldVals));
        });

        return ret;
    }

    // This should be the core of it, I don't yet understand at the trappings here, but this should produce the desired results
    // TODO: should provided values trump fn?  I think yes, if we want to use both,
    // TODO: or we could enforce 'you may provide values OR a filterFn but not both'
    constructor(fieldName, values, filterFn) {
        super();
        this.fieldName = fieldName;
        this.values = castArray(values);
        // ave fn as local?

        if (values.length == 1) {
            const singleVal = values[0];
            this.matches = (rec) => {
                const val = rec.get(fieldName);
                if (val === singleVal) return true;
                return filterFn(val);
            };
        } else {
            this.matches = (rec) => {
                const val = rec.get(fieldName);
                if (values.includes(val)) return true;
                return filterFn(val);
            };
        }
    }

    toString() {
        return ValueFilter.encode(this.fieldName, this.values);
    }
}