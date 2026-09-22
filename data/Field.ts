/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject, XH} from '@xh/hoist/core';
import {RuleLike} from '@xh/hoist/data/validation/Types';
import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
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

    /** Supplementary descriptive text for this field, for use in tooltips and other UI. */
    description?: string;

    /** Value to be used for records with a null, or non-existent value. */
    defaultValue?: any;

    /** True if this field is intended to be used for grouping.  Defaults to false. */
    isDimension?: boolean;

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

    /**
     * Function computing this field's value from the record's other values, making it a *derived*
     * field. Values are read through a getter on record `data` - never loaded, parsed, or written,
     * and always current with their inputs:
     *
     * ```ts
     * {name: 'marketValue', dependsOn: ['quantity', 'price'], derivedFn: d => d.quantity * d.price}
     * ```
     *
     * Requires `dependsOn`. Derived fields are read-only - {@link Store.modifyRecords} ignores
     * writes to them. A Store that is a `projectionOnly` view of another's data (e.g. one
     * connected to a Cube View) adopts derived values from its provider rather than computing them.
     *
     * On a {@link CubeField}, the function also runs on every View row where the field is not
     * aggregated - so a field with an `aggregator` derives at the leaves and rolls up (market
     * value), while one without derives at every level from that row's aggregates (PnL in bps).
     */
    derivedFn?: DerivedFn;

    /**
     * Names of the fields a `derivedFn` reads - required with `derivedFn`, and may be empty. A
     * Cube Query including a derived field includes these as well.
     */
    dependsOn?: string[];
}

/** Function computing a derived field's value from the other values on a record or View row. */
export type DerivedFn = (data: PlainObject) => any;

/**
 * Metadata for an individual data field within a {@link StoreRecord}.
 *
 * @mcpHint metadata for a data field within a Store or Cube
 */
export class Field {
    get isField() {
        return true;
    }

    /** True if this field's value is computed from other values - see {@link FieldSpec.derivedFn}. */
    get isDerived(): boolean {
        return !!this.derivedFn;
    }

    readonly name: string;
    readonly type: FieldType;
    readonly displayName: string;
    readonly description: string;
    readonly defaultValue: any;
    readonly isDimension: boolean;
    readonly rules: Rule[];
    readonly enableXssProtection: boolean;
    readonly derivedFn: DerivedFn;
    readonly dependsOn: string[];

    constructor({
        name,
        type = 'auto',
        displayName,
        description,
        defaultValue = null,
        isDimension = false,
        rules = [],
        enableXssProtection = XH.appSpec.enableXssProtection,
        derivedFn = null,
        dependsOn = null
    }: FieldSpec) {
        this.name = name;
        this.type = type;
        this.displayName = withDefault(displayName, genDisplayName(name));
        this.description = description;
        this.defaultValue = defaultValue;
        this.isDimension = isDimension;
        this.rules = this.processRuleSpecs(rules);
        this.enableXssProtection = enableXssProtection;
        this.derivedFn = derivedFn;
        this.dependsOn = dependsOn;
        throwIf(
            derivedFn && !dependsOn,
            `Field '${name}' declares a 'derivedFn' but no 'dependsOn' - name the fields it reads, or pass [].`
        );
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
                v = !enableXssProtection || !isString(v) ? v : sanitizeVal(v);
                return v.toString();
            });
            return val;
        case 'auto':
        case 'json':
            return !enableXssProtection || !isString(val) ? val : sanitizeVal(val);
        case 'int':
            val = toNumber(val);
            return isFinite(val) ? Math.trunc(val) : null;
        case 'number':
            return toNumber(val);
        case 'bool':
            return !!val;
        case 'pwd':
        case 'string':
            val = !enableXssProtection || !isString(val) ? val : sanitizeVal(val);
            return val.toString();
        case 'date':
            return isLocalDate(val) ? val.date : isDate(val) ? val : new Date(val);
        case 'localDate':
            if (isLocalDate(val)) return val;
            // `get` parses strict 'YYYYMMDD'/'YYYY-MM-DD' strings; `from` coerces Date/number/moment.
            return isString(val) ? LocalDate.get(val) : LocalDate.from(val);
    }

    throw XH.exception(`Unknown field type '${type}'`);
}

/**
 * Sanitize via DOMPurify, preserving the reference identity of values it does not modify.
 * DOMPurify allocates a fresh string on every call, even when sanitization is a no-op -
 * returning the original in that case keeps values deduplicated upstream (e.g. via
 * `FetchOptions.internStrings`) shared, and avoids retaining a second copy of every parsed
 * string value alongside `StoreRecord.raw`.
 */
function sanitizeVal(val: string): string {
    const ret = DOMPurify.sanitize(val);
    return ret === val ? val : ret;
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
