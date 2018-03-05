/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {isString} from 'lodash';
import {Field} from './Field';

/**
 * A managed observable set of Records.
 *
 * This class is intended to be abstract.  See LocalStore or UrlStore for
 * concrete implementations.
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
    set filter(filterFn) {}


    /**
     * Construct this object.
     *
     * @param fields, list of Fields or valid configuration for Fields.
     *      (A simple string representing the field name is sufficient).
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
     * @param raw, json object containing raw data, and 'id' property
     *
     * This method will apply basic validation and conversion
     * (e.g. 'date' will convert from UTC time to a JS Date object).
     *
     * An exception will be thrown if the validation or conversion fails.
     */
    createRecord(raw) {
        const ret = {id: raw.id, raw};

        this.fields.forEach(field => {
            const {type, name, defaultValue} = field;
            let val = raw[name]
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
                        val = val;
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