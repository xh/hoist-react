/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {FilterValueMode, parseFieldValue} from '@xh/hoist/data';
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

    static OPERATORS = ['=', '!=', '>', '>=', '<', '<=', 'like', 'not like', 'begins', 'ends'];
    static ARRAY_OPERATORS = ['=', '!=', 'like', 'not like', 'begins', 'ends'];

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

        if (FieldFilter.ARRAY_OPERATORS.includes(op)) {
            value = castArray(value);
        }

        let opTestFn;
        switch (op) {
            case '=':
                opTestFn = v => {
                    if (isNil(v) || v === '') v = null;
                    return value.includes(v);
                };
                break;
            case '!=':
                opTestFn = v => {
                    if (isNil(v) || v === '') v = null;
                    return !value.includes(v);
                };
                break;
            case '>':
                opTestFn = v => !isNil(v) && v > value;
                break;
            case '>=':
                opTestFn = v => !isNil(v) && v >= value;
                break;
            case '<':
                opTestFn = v => !isNil(v) && v < value;
                break;
            case '<=':
                opTestFn = v => !isNil(v) && v <= value;
                break;
            case 'like':
                regExps = value.map(v => new RegExp(escapeRegExp(v), 'i'));
                opTestFn = v => regExps.some(re => re.test(v));
                break;
            case 'not like':
                regExps = value.map(v => new RegExp(escapeRegExp(v), 'i'));
                opTestFn = v => regExps.every(re => !re.test(v));
                break;
            case 'begins':
                regExps = value.map(v => new RegExp('^' + escapeRegExp(v), 'i'));
                opTestFn = v => regExps.some(re => re.test(v));
                break;
            case 'ends':
                regExps = value.map(v => new RegExp(escapeRegExp(v) + '$', 'i'));
                opTestFn = v => regExps.some(re => re.test(v));
                break;
            default:
                throw XH.exception(`Unknown operator: ${op}`);
        }

        if (!store) return r => opTestFn(r[field]);

        // Pass/fail depends on the filter value mode of the store
        // Uncommitted records always pass the filter
        switch (store.filterValueMode) {
            case FilterValueMode.COMMITTED:
                // Pass only if the committed value passes
                return r => r.isAdd || opTestFn(r.getCommitted(field));
            case FilterValueMode.CURRENT:
                // Pass only if the current value passes
                return r => r.isAdd || opTestFn(r.get(field));
            case FilterValueMode.ANY:
                // Pass if either the current or committed value passes
                return r => r.isAdd || opTestFn(r.get(field)) || opTestFn(r.getCommitted(field));
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
