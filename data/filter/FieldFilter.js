/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {parseFieldValue} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {castArray, escapeRegExp, isArray, isString} from 'lodash';

import {Filter} from './Filter';

/**
 * Represents a filter operation on a predefined Field.
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
     * Create a new FieldFilter. Accepts a FieldFilter configuration or a string representation
     * generated using FieldFilter.serialize().
     *
     * @param {(Object|string)} cfg - FieldFilter configuration as object or serialized JSON string.
     */
    static create(cfg) {
        if (isString(cfg)) {
            cfg = JSON.parse(cfg);
        }
        return new FieldFilter(cfg);
    }

    /**
     * @param {Object} c - FieldFilter configuration.
     * @param {(string|Field)} c.field - name of Field to filter or Field instance itself.
     * @param {string} c.op - operator to use in filter. Must be one of the OPERATORS.
     * @param {(*|[])} c.value - value(s) to use with operator in filter. In the case of the
     *      '=', '!=', 'like' may be specified as an array of values.  In this case, the filter will
     *      implement an implicit 'OR' for '=' and 'like' and an implicit 'AND' for '!='.
     */
    constructor({field, op, value}) {
        super();

        throwIf(!field, 'FieldFilter requires a field');
        throwIf(!FieldFilter.OPERATORS.includes(op),
            `FieldFilter requires valid "op" value. Operator "${op}" not recognized.`
        );
        throwIf(!FieldFilter.ARRAY_OPERATORS.includes(op) && isArray(value),
            `Operator "${op}" does not support multiple values.  Use a CompoundFilter instead.`
        );

        this.field = isString(field) ? field : field.name;
        this.op = op;
        this.value = isArray(value) ? [...value] : value;

        Object.freeze(this);
    }

    //-----------------
    // Overrides
    //-----------------
    serialize() {
        const {field, op, value} = this;
        return JSON.stringify({field, op, value});
    }

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
                return r => getVal(r) > value;
            case '>=':
                return r => getVal(r) >= value;
            case '<':
                return r => getVal(r) < value;
            case '<=':
                return r => getVal(r) <= value;
            case 'like':
                regExps = value.map(v => new RegExp(escapeRegExp(v), 'i'));
                return r => regExps.some(re => re.test(getVal(r)));
            default:
                throw XH.exception(`Unknown operator: ${op}`);
        }
    }

    equals(other) {
        return other.isFieldFilter && other.serialize() === this.serialize();
    }
}
