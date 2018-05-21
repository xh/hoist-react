/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {isString} from 'lodash';
import {XH} from '@xh/hoist/core';

import {Field} from './Field';

/**
 * A managed observable set of Records.
 * @abstract - see LocalStore or UrlStore for concrete implementations.
 */
export class BaseStore {

    /** List of fields contained in each record.  **/
    fields = null;

    /** Get a specific field, by name.  **/
    getField(name) {
        return this.fields.find(it => it.name === name);
    }

    /** Current loading state. **/
    get loadModel() {}

    /** Current records. These represent the post-filtered records. **/
    get records() {}

    /** All records.  These are the pre-filtered records. **/
    get allRecords() {}

    /** Filter.  Filter function to be applied. **/
    get filter() {}
    setFilter(filterFn) {}

    /**
     * Get a record by ID. Return null if no record found.
     *
     * @param {number} id
     * @param {boolean} filteredOnly - set to true to skip non-filtered records
     */
    getById(id, filteredOnly) {}

    /**
     * @param {(string[]|Object[])} fields - list of Fields or valid configuration for Fields
     *      (A simple string representing the field name is sufficient for an entry).
     */
    constructor({fields}) {
        this.fields = fields.map(f => {
            if (f instanceof Field) return f;
            if (isString(f)) f = {name: f};
            return new this.defaultFieldClass(f);
        });
    }

    //--------------------
    // For Implementations
    //--------------------
    get defaultFieldClass() {
        return Field;
    }

    /**
     * Create a record from rawData presented.
     *
     * Can apply basic validation and conversion (e.g. 'date' will convert from UTC time to
     * a JS Date object). An exception will be thrown if the validation or conversion fails.
     *
     *  @param {Object} raw - json object containing raw data and 'id' property
     */
    createRecord(raw) {
        const ret = {id: raw.id, raw};

        this.fields.forEach(field => {
            const {type, name, defaultValue} = field;
            let val = raw[name];
            if (val === undefined || val === null) val = defaultValue;

            if (val !== null) {
                // TODO -- Add additional validation and conversion?
                switch (type) {
                    case 'auto':
                    case 'string':
                    case 'int':
                    case 'number':
                    case 'bool':
                    case 'json':
                    case 'day':
                        break;
                    case 'date':
                        val = new Date(val);
                        break;
                    default:
                        throw XH.exception(`Unknown field type '${type}'`);
                }
            }

            ret[name] = val;
        });

        return ret;
    }
}
