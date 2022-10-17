/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {withDefault} from '@xh/hoist/utils/js';
import {Rule, RuleLike} from './validation/Rule';
import equal from 'fast-deep-equal';
import {isDate, isString, toNumber, isFinite, startCase, isFunction, castArray} from 'lodash';
import DOMPurify from 'dompurify';

/**
 * Metadata for an individual data field within a {@see Record}.
 */
export class Field {

    get isField() {return true}

    name: string;
    type: FieldType;
    displayName: string;
    defaultValue: any;
    rules: Rule[];
    disableXssProtection: boolean;

    constructor({
        name,
        type = 'auto',
        displayName,
        defaultValue = null,
        rules = [],
        disableXssProtection = XH.appSpec.disableXssProtection
    }: FieldConfig) {
        this.name = name;
        this.type = type;
        this.displayName = withDefault(displayName, genDisplayName(name));
        this.defaultValue = defaultValue;
        this.rules = this.processRuleSpecs(rules);
        this.disableXssProtection = disableXssProtection;
    }

    parseVal(val: any): any {
        const {type, defaultValue, disableXssProtection} = this;
        return parseFieldValue(val, type, defaultValue, disableXssProtection);
    }

    isEqual(val1: any, val2: any): boolean {
        return equal(val1, val2);
    }

    //------------------------
    // Implementation
    //------------------------
    private processRuleSpecs(ruleSpecs: RuleLike[]): Rule[] {
        return ruleSpecs.map(spec => {
            if (spec instanceof Rule) return spec;
            if (isFunction(spec)) return new Rule({check: spec});
            return new Rule(spec);
        });
    }
}

/**
 * Parse a value according to a field type.
 * @param val - raw value to parse.
 * @param type - data type of the field to use for possible conversion.
 * @param defaultValue - typed value to return if `val` undefined or null.
 * @param disableXssProtection - true to disable XSS (cross-site scripting) protection.
 *      @see {@link FieldConfig} docs for additional details.
 * @returns resulting value, potentially parsed or cast as per type.
 */
export function parseFieldValue(
    val: any,
    type: FieldType,
    defaultValue: any = null,
    disableXssProtection = XH.appSpec.disableXssProtection
): any {
    if (val === undefined || val === null) val = defaultValue;
    if (val === null) return val;

    const sanitizeValue = (v) => {
        if (disableXssProtection || !isString(v)) return v;
        return DOMPurify.sanitize(v);
    };

    const FT = FieldType;
    switch (type) {
        case FT.TAGS:
            val = castArray(val);
            val = val.map(v => {
                v = sanitizeValue(v);
                return v.toString();
            });
            return val;
        case FT.AUTO:
        case FT.JSON:
            return sanitizeValue(val);
        case FT.INT:
            val = toNumber(val);
            return isFinite(val) ? Math.trunc(val) : null;
        case FT.NUMBER:
            return toNumber(val);
        case FT.BOOL:
            return !!val;
        case FT.PWD:
        case FT.STRING:
            val = sanitizeValue(val);
            return val.toString();
        case FT.DATE:
            return isDate(val) ? val : new Date(val);
        case FT.LOCAL_DATE:
            return isLocalDate(val) ? val : LocalDate.get(val);
    }

    throw XH.exception(`Unknown field type '${type}'`);
}

/** Data types for Fields used within Hoist Store Records and Cubes. */
export const FieldType = Object.freeze({
    TAGS: 'tags',
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

// eslint-disable-next-line
export type FieldType = typeof FieldType[keyof typeof FieldType];

/**
 * @param fieldName - short name / code for a field.
 * @returns fieldName transformed into user-facing / longer name for display.
 */
export function genDisplayName(fieldName: string): string {
    return fieldName === 'id' ? 'ID' : startCase(fieldName);
}

/**
 * ctor arguments for a Hoist data package Field.
 */
export interface FieldConfig {

    /** Unique key representing this field. */
    name: string;

    /** default `'auto` indicates no conversion.*/
    type?: FieldType;

    /**
     *  User-facing / longer name for display, defaults to `name`
     *  transformed via `genDisplayName()` (e.g. 'myField' -> 'My Field').
     */
    displayName?: string;

    /** Value to be used for records with a null, or non-existent value. */
    defaultValue?: any;

    /** Rules to apply to this field. */
    rules?: RuleLike[];

    /**
     * True to disable built-in XSS (cross-site scripting) protection, applied by default to all
     * incoming String values via the DOMPurify library. DOMPurify provides fast escaping of
     * dangerous HTML, scripting, and other content that can be used to execute XSS attacks, while
     * allowing common and expected HTML and style tags.
     * Please contact XH if you find yourself needing to disable this protection!
     *  {@link https://github.com/cure53/DOMPurify}
     */
    disableXssProtection ?: boolean;
}
