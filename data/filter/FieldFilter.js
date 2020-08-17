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
     * @param {(*|[])} c.value - value(s) to use with operator in filter.
     * @param {string} [c.op] - operator to use in filter. Must be one of the OPERATORS.
     */
    constructor({field, value, op = '='}) {
        super();

        throwIf(!field, 'FieldFilter requires a field');
        throwIf(!FieldFilter.OPERATORS.includes(op),
            `FieldFilter requires valid "op" value. Operator "${op}" not recognized.`
        );

        this.field = isString(field) ? field : field.name;
        this.value = value;
        this.op = op;

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
        let {field, value, op} = this,
            regExps;

        if (store) {
            const fieldType = store.getField(field).type;
            value = isArray(value) ?
                value.map(v => parseFieldValue(v, fieldType)) :
                parseFieldValue(value, fieldType);
        }
        const getVal = store ? r => r.get(field) : r => r[field];

        if (op === '=' || op === '!=' || op === 'like') {
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
