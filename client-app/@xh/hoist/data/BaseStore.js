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
 * This class is intended to be abstract.  See LocalStore, RestStore, or UrlStore for
 * concrete implementations.
 */
export class BaseStore {

    /** Fields contained in each record.  **/
    fields = null;

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
     *      (A simple string representing the name is an acceptable default value)
     */
    constructor({fields}) {
        this.fields = fields.map(f => {
            if (f instanceof Field) return f;
            if (isString(f)) f = {name: f};
            return new Field(f);
        });
    }


    /**
     * Create a record from rawData presented.
     *
     * @param raw, json object containing raw data, and 'id' property
     *
     * This method will apply basic validation for nullability and type,
     * and basic conversion (e.g. 'date').   An exception will be thrown
     * if the validation or conversion fails.
     */
    createRecord(raw) {
        const ret = {id: raw.id, raw};

        this.fields.forEach(field => {
            const {type, name} = field;
            let val = raw[name]
            if (val === undefined) val = null;

            if (!field.allowNull && val === null) {
                throw XH.exception(`Null value not allowed for field ${name}`);
            }

            if (val !== null) {
                // TODO -- Add validation and conversion?
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