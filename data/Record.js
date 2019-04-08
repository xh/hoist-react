/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {clone} from 'lodash';

/**
 * Core data for Store.
 *
 * This object is intended to be created and managed internally by Store implementations.
 */
export class Record {

    /** @member {string} - unique ID. */
    id;

    /** @member {Object} - unconverted source data. */
    raw;

    /** @member {Object} - converted data. */
    data;

    /** @member {Field[]} - fields for this record. */
    fields;

    /** @member {string} - Parent of this record, or null if there is no parent. */
    parentId;

    /**
     * Will apply basic validation and conversion (e.g. 'date' will convert from UTC time to
     * a JS Date object). An exception will be thrown if the validation or conversion fails.
     */
    constructor({raw, parent, fields) {
        this.id = raw.id;
        this.raw = raw;
        this.parentId = parent ? parentId : null;
        this.fields = fields;

        this.xhTreePath = parent ? [...parent.xhTreePath, this.id] : [this.id];

        fields.forEach(field => {
            const {type, name, defaultValue} = field;
            let val = raw[name];
            if (val === undefined || val === null) val = defaultValue;

            if (val !== null) {
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
            this.data[name] = val;
        });
    }
}