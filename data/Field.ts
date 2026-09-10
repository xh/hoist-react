/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject, XH} from '@xh/hoist/core';
import {RuleLike} from '@xh/hoist/data/validation/Types';
import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {withDefault} from '@xh/hoist/utils/js';
import {Rule} from './validation/Rule';
import equal from 'fast-deep-equal';
import {isDate, isString, toNumber, isFinite, startCase, isFunction, castArray} from 'lodash';
import DOMPurify from 'dompurify';
import type {Store} from './Store';
import type {CubeCalculatedFn} from './cube/CubeField';

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
     * Function computing this field's value at read time from the record's other values and the
     * Store, making this a *calculated* field - derived on the client rather than loaded:
     *
     * ```ts
     * {
     *     name: 'pctCommission',
     *     calculatedFn: (data, store) =>
     *         (data.commission / store.summaryRecords[0]?.data.commission) * 100
     * }
     * ```
     *
     * Values are read via lazy prototype getters on record `data` - never stored, parsed, or
     * compared for record reuse, and always current, even when inputs live outside the record
     * (e.g. a summary denominator). Grids repaint calculated columns after each transaction,
     * and a `FieldFilter` on one triggers a full re-filter. (`FunctionFilter`s are opaque and
     * may need a manual {@link Store.refreshFilter}.)
     *
     * Calculated fields are read-only ({@link Store.modifyRecords} throws, columns are never
     * editable, `type` is display-only) and invisible to own-property enumeration - read values
     * by name, or via {@link StoreRecord.getValues}. Keep the fn pure and fast (it runs per
     * cell paint and per sort comparison), return primitives or stable references, and avoid
     * cycles when reading other calculated fields.
     *
     * See {@link CubeFieldSpec.calculatedFn} for the Cube View form - the union type keeps
     * `CubeFieldSpec` assignable wherever `FieldSpec` is accepted; on a plain Store, always
     * supply the {@link StoreCalculatedFn} form.
     */
    calculatedFn?: StoreCalculatedFn | CubeCalculatedFn;
}

/**
 * Function computing a Store-level calculated field value at read time.
 * See {@link FieldSpec.calculatedFn}.
 */
export type StoreCalculatedFn = (data: PlainObject, store: Store) => any;

/**
 * Function computing a calculated field value at read time - the union of the layer-specific
 * signatures declared by {@link FieldSpec.calculatedFn} (Store) and `CubeFieldSpec.calculatedFn`
 * (Cube View).
 */
export type CalculatedFn = (data: any, context: any) => any;

/**
 * Metadata for an individual data field within a {@link StoreRecord}.
 *
 * @mcpHint metadata for a data field within a Store or Cube
 */
export class Field {
    get isField() {
        return true;
    }

    /** True for {@link CubeField} instances - see that subclass. */
    get isCubeField() {
        return false;
    }

    readonly name: string;
    readonly type: FieldType;
    readonly displayName: string;
    readonly description: string;
    readonly defaultValue: any;
    readonly isDimension: boolean;
    readonly rules: Rule[];
    readonly enableXssProtection: boolean;

    /**
     * Function computing this field's value at read time, marking it as a calculated field.
     * Layer-specific signatures - see {@link FieldSpec.calculatedFn} (Store) and
     * `CubeFieldSpec.calculatedFn` (Cube View). Not readonly to support subclass assignment
     * and anticipated runtime updates to calculated field specs.
     */
    calculatedFn: CalculatedFn;

    /** True if this field's value is computed at read time - see {@link FieldSpec.calculatedFn}. */
    get isCalculated(): boolean {
        return !!this.calculatedFn;
    }

    constructor({
        name,
        type = 'auto',
        displayName,
        description,
        defaultValue = null,
        isDimension = false,
        rules = [],
        enableXssProtection = XH.appSpec.enableXssProtection,
        calculatedFn = null
    }: FieldSpec) {
        this.name = name;
        this.type = type;
        this.displayName = withDefault(displayName, genDisplayName(name));
        this.description = description;
        this.defaultValue = defaultValue;
        this.isDimension = isDimension;
        this.rules = this.processRuleSpecs(rules);
        this.enableXssProtection = enableXssProtection;
        this.calculatedFn = calculatedFn;
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
