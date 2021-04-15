/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {parseFieldValue} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {castArray, escapeRegExp, isArray, isEqual, isNil, isString} from 'lodash';

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

    static OPERATORS = ['=', '!=', '>', '>=', '<', '<=', 'like'];
    static ARRAY_OPERATORS = ['=', '!=', 'like'];

    /**
     * Constructor - not typically called by apps - create from config via `parseFilter()` instead.
     *
     * @param {Object} c - FieldFilter config.
     * @param {(string|Field)} c.field - name of Field to filter or Field instance.
     * @param {string} c.op - one of the supported Filter.OPERATORS to use for comparison.
     * @param {(*|[])} c.value - value(s) to use with operator in filter. When used with the '=',
     *      '!=', or 'like' operators, value may be specified as an array. In these cases, the
     *      filter will implement an implicit 'OR' for '='/'like' and an implicit 'AND' for '!='.
     */
    constructor({field, op, value}) {
        super();

        throwIf(!field, 'FieldFilter requires a field');
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
            const fieldType = store.getField(field).type;
            value = isArray(value) ?
                value.map(v => parseFieldValue(v, fieldType)) :
                parseFieldValue(value, fieldType);
        }
        const getVal = store ? r => r.get(field) : r => r[field];

        if (FieldFilter.ARRAY_OPERATORS.includes(op)) {
            value = castArray(value);
        }

        switch (op) {
            case '=':
                return r => value.includes(getVal(r));
            case '!=':
                return r => !value.includes(getVal(r));
            case '>':
                return r => {
                    const v = getVal(r);
                    return !isNil(v) && v > value;
                };
            case '>=':
                return r => {
                    const v = getVal(r);
                    return !isNil(v) && v >= value;
                };
            case '<':
                return r => {
                    const v = getVal(r);
                    return !isNil(v) && v < value;
                };
            case '<=':
                return r => {
                    const v = getVal(r);
                    return !isNil(v) && v <= value;
                };
            case 'like':
                regExps = value.map(v => new RegExp(escapeRegExp(v), 'i'));
                return r => regExps.some(re => re.test(getVal(r)));
            default:
                throw XH.exception(`Unknown operator: ${op}`);
        }
    }

    isEmptyCheck() {
        const {value, op} = this;
        return (
            isEqual(value, [null, '']) || isEqual(value, ['', null]) &&
            (op === '!=' || op === '=')
        );
    }

    equals(other) {
        return other?.isFieldFilter && other.op === this.op && isEqual(other.value, this.value);
    }
}
