/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {RuleLike} from '@xh/hoist/data/validation/Types';
import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {withDefault} from '@xh/hoist/utils/js';
import {Rule} from './validation/Rule';
import equal from 'fast-deep-equal';
import {isDate, isString, toNumber, isFinite, startCase, isFunction, castArray} from 'lodash';
import DOMPurify from 'dompurify';

/**
 * Constructor arguments for a Hoist data package Field.
 */
export interface FieldSpec {
    /** Unique key representing this field. */
    name: string;

    /** default `'auto` indicates no conversion.*/
    type?: FieldType;

    /**
     *  User-facing / longer name for display, defaults to `name`
     *  transformed via `genDisplayName()` (e.g. 'myField' translates to 'My Field').
     */
    displayName?: string;

    /** Value to be used for records with a null, or non-existent value. */
    defaultValue?: any;

    /** Rules to apply to this field. */
    rules?: RuleLike[];

    /**
     * True to enable built-in XSS (cross-site scripting) protection to all incoming String values
     * using {@link https://github.com/cure53/DOMPurify | DOMPurify}.
     *
     * DOMPurify provides fast escaping of dangerous HTML, scripting, and other content that can be
     * used to execute XSS attacks, while allowing common and expected HTML and style tags.
     *
     * This feature does exact a minor performance penalty during data parsing, which can be
     * significant in aggregate for very large stores containing records with many `string` fields.
     *
     * For extra safety, apps which are open to potentially-untrusted users or display other
     * potentially dangerous string content can opt into this setting app-wide via
     * {@link AppSpec.enableXssProtection}. Field-level setting will override any app-level default.
     *
     * Note: this flag and its default behavior was changed as of Hoist v77 to be `false`, i.e.
     * Store-level XSS protection *disabled* by default, in keeping with Hoist's primary use-case:
     * building secured internal apps with large datasets and tight performance tolerances.
     */
    enableXssProtection?: boolean;
}

/** Metadata for an individual data field within a {@link StoreRecord}. */
export class Field {
    get isField() {
        return true;
    }

    readonly name: string;
    readonly type: FieldType;
    readonly displayName: string;
    readonly defaultValue: any;
    readonly rules: Rule[];
    readonly enableXssProtection: boolean;

    constructor({
        name,
        type = 'auto',
        displayName,
        defaultValue = null,
        rules = [],
        enableXssProtection = XH.appSpec.enableXssProtection
    }: FieldSpec) {
        this.name = name;
        this.type = type;
        this.displayName = withDefault(displayName, genDisplayName(name));
        this.defaultValue = defaultValue;
        this.rules = this.processRuleSpecs(rules);
        this.enableXssProtection = enableXssProtection;
    }

    parseVal(val: any): any {
        const {type, defaultValue, enableXssProtection} = this;
        return parseFieldValue(val, type, defaultValue, enableXssProtection);
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
 * @param enableXssProtection - true to enable XSS (cross-site scripting) protection.
 *      See {@link FieldSpec.enableXssProtection} for additional details.
 * @returns resulting value, potentially parsed or cast as per type.
 */
export function parseFieldValue(
    val: any,
    type: FieldType,
    defaultValue: any = null,
    enableXssProtection: boolean = XH.appSpec.enableXssProtection
): any {
    if (val === undefined || val === null) val = defaultValue;
    if (val === null) return val;

    switch (type) {
        case 'tags':
            val = castArray(val);
            val = val.map(v => {
                v = !enableXssProtection || !isString(v) ? v : DOMPurify.sanitize(v);
                return v.toString();
            });
            return val;
        case 'auto':
        case 'json':
            return !enableXssProtection || !isString(val) ? val : DOMPurify.sanitize(val);
        case 'int':
            val = toNumber(val);
            return isFinite(val) ? Math.trunc(val) : null;
        case 'number':
            return toNumber(val);
        case 'bool':
            return !!val;
        case 'pwd':
        case 'string':
            val = !enableXssProtection || !isString(val) ? val : DOMPurify.sanitize(val);
            return val.toString();
        case 'date':
            return isLocalDate(val) ? val.date : isDate(val) ? val : new Date(val);
        case 'localDate':
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
export type FieldType = (typeof FieldType)[keyof typeof FieldType];

/**
 * @param fieldName - short name / code for a field.
 * @returns fieldName transformed into user-facing / longer name for display.
 */
export function genDisplayName(fieldName: string): string {
    // Handle common cases of "id" -> "ID" and "foo_id" -> "Foo ID" (vs "Foo Id")
    return startCase(fieldName).replace(/(^| )Id\b/g, '$1ID');
}

/** Convenience function to return the name of a field from one of several common inputs. */
export function getFieldName(field: string | Field | FieldSpec): string {
    return field ? (isString(field) ? field : field.name) : null;
}
