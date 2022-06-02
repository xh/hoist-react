/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {parseFieldValue} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {castArray, difference, escapeRegExp, isArray, isNil, isUndefined, isString} from 'lodash';

import {Filter} from './Filter';

/**
 * Filters by comparing the value of a given field to one or more given candidate values using one
 * of several supported operators.
 *
 * Note that the comparison operators [<,<=,>,>=] always return false for null and undefined values,
 * favoring the behavior of Excel over Javascript's implicit conversion of nullish values to 0.
 *
 * Immutable.
 */
export class FieldFilter extends Filter {

    get isFieldFilter() {return true}

    /** @member {string} */
    field;
    /** @member {string} */
    op;
    /** @member {*} */
    value;

    static OPERATORS = ['=', '!=', '>', '>=', '<', '<=', 'like', 'not like', 'begins', 'ends', 'includes', 'does not include'];
    static ARRAY_OPERATORS = ['=', '!=', 'like', 'not like', 'begins', 'ends', 'includes', 'does not include'];

    /**
     * Constructor - not typically called by apps - create from config via `parseFilter()` instead.
     *
     * @param {Object} c - FieldFilter config.
     * @param {(string|Field)} c.field - name of Field to filter or Field instance.
     * @param {string} c.op - one of the supported Filter.OPERATORS to use for comparison.
     * @param {(*|[])} c.value - value(s) to use with operator in filter. When used with operators
     *      in the ARRAY_OPERATORS collection, value may be specified as an array. In these cases,
     *      the filter will implement an implicit 'OR' for '='/'like'/'begins'/'ends',
     *      and an implicit 'AND' for '!='/'not like'.
     */
    constructor({field, op, value}) {
        super();

        throwIf(!field, 'FieldFilter requires a field');
        throwIf(isUndefined(value), 'FieldFilter requires a value');
        throwIf(!FieldFilter.OPERATORS.includes(op),
            `FieldFilter requires valid "op" value. Operator "${op}" not recognized.`
        );
        throwIf(!FieldFilter.ARRAY_OPERATORS.includes(op) && isArray(value),
            `Operator "${op}" does not support multiple values. Use a CompoundFilter instead.`
        );

        this.field = isString(field) ? field : field.name;
        this.op = op;
        this.value = isArray(value) ? [...value] : value;

        Object.freeze(this);
    }

    /** Outputs JSON appropriate for recreation via `parseFilter` */
    toJSON() {
        const {field, op, value} = this;
        return {field, op, value};
    }

    //-----------------
    // Overrides
    //-----------------
    getTestFn(store) {
        let {field, op, value} = this,
            regExps;

        if (store) {
            const storeField = store.getField(field);
            if (!storeField) return () => true; // Ignore (do not filter out) if field not in store

            const fieldType = storeField.type;
            value = isArray(value) ?
                value.map(v => parseFieldValue(v, fieldType)) :
                parseFieldValue(value, fieldType);
        }
        const getVal = store ? r => r.committedData[field] : r => r[field],
            doNotFilter = r => store && isNil(r.committedData); // Ignore (do not filter out) record if part of a store and it has no committed data

        if (FieldFilter.ARRAY_OPERATORS.includes(op)) {
            value = castArray(value);
        }

        switch (op) {
            case '=':
                return r => {
                    if (doNotFilter(r)) return true;
                    let v = getVal(r);
                    if (isNil(v) || v === '') v = null;
                    return value.includes(v);
                };
            case '!=':
                return r => {
                    if (doNotFilter(r)) return true;
                    let v = getVal(r);
                    if (isNil(v) || v === '') v = null;
                    return !value.includes(v);
                };
            case '>':
                return r => {
                    if (doNotFilter(r)) return true;
                    const v = getVal(r);
                    return !isNil(v) && v > value;
                };
            case '>=':
                return r => {
                    if (doNotFilter(r)) return true;
                    const v = getVal(r);
                    return !isNil(v) && v >= value;
                };
            case '<':
                return r => {
                    if (doNotFilter(r)) return true;
                    const v = getVal(r);
                    return !isNil(v) && v < value;
                };
            case '<=':
                return r => {
                    if (doNotFilter(r)) return true;
                    const v = getVal(r);
                    return !isNil(v) && v <= value;
                };
            case 'like':
                regExps = value.map(v => new RegExp(escapeRegExp(v), 'i'));
                return r => {
                    if (doNotFilter(r)) return true;
                    return regExps.some(re => re.test(getVal(r)));
                };
            case 'not like':
                regExps = value.map(v => new RegExp(escapeRegExp(v), 'i'));
                return r => {
                    if (doNotFilter(r)) return true;
                    regExps.every(re => !re.test(getVal(r)));
                };
            case 'begins':
                regExps = value.map(v => new RegExp('^' + escapeRegExp(v), 'i'));
                return r => {
                    if (doNotFilter(r)) return true;
                    regExps.some(re => re.test(getVal(r)));
                };
            case 'ends':
                regExps = value.map(v => new RegExp(escapeRegExp(v) + '$', 'i'));
                return r => {
                    if (doNotFilter(r)) return true;
                    regExps.some(re => re.test(getVal(r)));
                };
            case 'includes':
                return r => {
                    if (doNotFilter(r)) return true;
                    const v = getVal(r);
                    return !isNil(v) && v.some(it => value.includes(it));
                };
            case 'does not include':
                return r => {
                    if (doNotFilter(r)) return true;
                    const v = getVal(r);
                    return isNil(v) || !v.some(it => value.includes(it));
                };
            default:
                throw XH.exception(`Unknown operator: ${op}`);
        }
    }

    equals(other) {
        if (other === this) return true;
        return (
            other?.isFieldFilter &&
            other.field === this.field &&
            other.op === this.op &&
            (
                isArray(other.value) && isArray(this.value) ?
                    other.value.length === this.value.length && difference(other.value, this.value).length === 0 :
                    other.value === this.value
            )
        );
    }
}
