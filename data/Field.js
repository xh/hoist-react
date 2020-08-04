/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import equal from 'fast-deep-equal';
import {isDate, startCase} from 'lodash';

/**
 * Metadata for an individual data field within a {@see Record}.
 */
export class Field {

    /** @member {string} */
    name;
    /** @member {FieldType} */
    type;
    /** @member {string} */
    displayName;
    /** @member {*} */
    defaultValue;

    /** @param {FieldConfig} c - Field configuration */
    constructor({
        name,
        type = FieldType.AUTO,
        displayName = startCase(name),
        defaultValue = null
    }) {
        this.name = name;
        this.type = type;
        this.displayName = displayName;
        this.defaultValue = defaultValue;
    }

    parseVal(val) {
        const {type, defaultValue} = this;
        return parseFieldValue(val, type, defaultValue);
    }

    isEqual(val1, val2) {
        return equal(val1, val2);
    }
}

/**
 * Parse a value according to a field type.
 * @param {*} val - raw value to parse.
 * @param {FieldType} type - data type of the field to use for possible conversion.
 * @param {*} [defaultValue] - typed value to return if `val` undefined or null.
 * @return {*} resulting value, potentially parsed or cast as per type.
 */
export function parseFieldValue(val, type, defaultValue = null) {
    if (val === undefined || val === null) val = defaultValue;
    if (val === null) return val;

    const FT = FieldType;
    switch (type) {
        case FT.AUTO:
        case FT.JSON:
            return val;
        case FT.INT:
            return parseInt(val);
        case FT.NUMBER:
            return parseFloat(val);
        case FT.BOOL:
            return !!val;
        case FT.PWD:
        case FT.STRING:
            return val.toString();
        case FT.DATE:
            return isDate(val) ? val : new Date(val);
        case FT.LOCAL_DATE:
            return isLocalDate(val) ? val : LocalDate.get(val);
    }

    throw XH.exception(`Unknown field type '${type}'`);
}

/** @enum {string} - data types for Fields used within Hoist Store Records and Cubes. */
export const FieldType = Object.freeze({
    AUTO: 'auto',
    BOOL: 'bool',
    DATE: 'date',
    INT: 'int',
    JSON: 'json',
    LOCAL_DATE: 'localDate',
    NUMBER: 'number',
    PWD: 'pwd',
    STRING: 'string'
});

/**
 * @typedef {Object} FieldConfig - ctor arguments for a Hoist data package Field.
 * @property {string} name - unique key representing this field.
 * @property {FieldType} [type] - default `FieldType.AUTO` indicates no conversion.
 * @property {string} [displayName] - user-friendly / longer name for display, defaults to `name`
 *      transformed via lodash `startCase` (e.g. fooBar -> Foo Bar).
 * @property {*} [defaultValue] - value to be used for records with a null, or non-existent value.
 */