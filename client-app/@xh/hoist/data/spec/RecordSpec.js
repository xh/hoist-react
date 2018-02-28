/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist/core';
import {isString} from 'lodash';

import {Field} from './Field';

/**
 * Metadata for Record.
 */
export class RecordSpec {

    fields = null;

    /**
     * Construct this object.
     *
     * @param fields, array. Fields or configs that can be used to create a Field,
     */
    constructor({fields = []}) {
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