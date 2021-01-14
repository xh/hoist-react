/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {withDefault} from '@xh/hoist/utils/js';
import equal from 'fast-deep-equal';
import {isDate, isString, startCase} from 'lodash';
import DOMPurify from 'dompurify';

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
    /** @member {boolean} */
    disableXssProtection;

    /** @param {FieldConfig} c - Field configuration */
    constructor({
        name,
        type = FieldType.AUTO,
        displayName,
        defaultValue = null,
        disableXssProtection = false
    }) {
        this.name = name;
        this.type = type;
        this.displayName = withDefault(displayName, genDisplayName(name));
        this.defaultValue = defaultValue;
        this.disableXssProtection = disableXssProtection;
    }

    parseVal(val) {
        const {type, defaultValue, disableXssProtection} = this;
        return parseFieldValue(val, type, defaultValue, disableXssProtection);
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
 * @param {boolean} [disableXssProtection] - true to disable XSS (cross-site scripting) protection.
 *      {@see FieldConfig} docs for additional details.
 * @return {*} resulting value, potentially parsed or cast as per type.
 */
export function parseFieldValue(val, type, defaultValue = null, disableXssProtection = false) {
    if (val === undefined || val === null) val = defaultValue;
    if (val === null) return val;

    if (!disableXssProtection && isString(val)) val = DOMPurify.sanitize(val);

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
 * @param {string} fieldName - short name / code for a field.
 * @return {string} - fieldName transformed into user-facing / longer name for display.
 */
export function genDisplayName(fieldName) {
    return fieldName === 'id' ? 'ID' : startCase(fieldName);
}

/**
 * @typedef {Object} FieldConfig - ctor arguments for a Hoist data package Field.
 * @property {string} name - unique key representing this field.
 * @property {FieldType} [type] - default `FieldType.AUTO` indicates no conversion.
 * @property {string} [displayName] - user-facing / longer name for display, defaults to `name`
 *      transformed via `genDisplayName()` (e.g. 'myField' -> 'My Field').
 * @property {*} [defaultValue] - value to be used for records with a null, or non-existent value.
 * @property {boolean} [disableXssProtection] - true to disable built-in XSS (cross-site scripting)
 *      protection, applied by default to all incoming String values via the DOMPurify library.
 *      DOMPurify provides fast escaping of dangerous HTML, scripting, and other content that can
 *      be used to execute XSS attacks, while allowing common and expected HTML and style tags.
 *      Please contact XH if you find yourself needing to disable this protection!
 *      {@link https://github.com/cure53/DOMPurify}
 */
