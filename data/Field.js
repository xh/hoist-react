/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Record} from '@xh/hoist/data/Record';
import {throwIf} from '@xh/hoist/utils/js';
import {startCase, isEqual as lodashIsEqual} from 'lodash';
import {XH} from '@xh/hoist/core';

/**
 * Metadata for an individual data field within a {@see Record}.
 */
export class Field {

    /** @member {string} */
    name;
    /** @member {string} */
    type;
    /** @member {string} */
    label;
    /** @member {*} */
    defaultValue;

    /**
     * @param {Object} c - Field configuration.
     * @param {string} c.name - unique key representing this field.
     * @param {string} [c.type] - one of ['auto', 'string', 'int', 'number', 'bool', 'json', 'date']
     *      Default 'auto' indicates no conversion.
     * @param {string} [c.label] - label for display, defaults to capitalized name.
     * @param {*} [c.defaultValue] - value to be used for records with a null, or non-existent value.
     */
    constructor({
        name,
        type = 'auto',
        label = startCase(name),
        defaultValue = null
    }) {

        throwIf(
            Record.RESERVED_FIELD_NAMES.includes(name),
            `Field name "${name}" cannot be used. It is reserved as a top-level property of the Record class.`
        );

        this.name = name;
        this.type = type;
        this.label = label;
        this.defaultValue = defaultValue;
    }

    parseVal(val) {
        const {type, defaultValue} = this;
        if (val === undefined || val === null) val = defaultValue;
        if (val === null) return val;

        switch (type) {
            case 'auto':
            case 'json':
                return val;
            case 'int':
                return parseInt(val);
            case 'number':
                return parseFloat(val);
            case 'bool':
                return !!val;
            case 'string':
                return val.toString();
            case 'date':
                return new Date(val);
        }

        throw XH.exception(`Unknown field type '${type}'`);
    }

    isEqual(val1, val2) {
        return lodashIsEqual(val1, val2);
    }
}