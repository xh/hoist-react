/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {parseFieldValue} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {isString, escapeRegExp} from 'lodash';

import {Filter} from './Filter';

/**
 * Represents a filter operation on a predefined Field. Used by {@see FilterModel}.
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

    static OPERATORS = [
        '=',
        '!=',
        '>',
        '>=',
        '<',
        '<=',
        'like'
    ];

    /**
     * @param {string} op
     * @returns {boolean} - true if the given operator is valid.
     */
    static isValidOperator(op) {
        return FieldFilter.OPERATORS.includes(op);
    }

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
     * @param {*} [c.value] - value to use with operator in filter.
     * @param {string} [c.group] - Optional group associated with this filter.
     */
    constructor({
        field,
        op,
        value,
        group = null
    }) {
        super();

        throwIf(!field, 'FieldFilter requires a field');
        throwIf(!FieldFilter.isValidOperator(op), `FieldFilter requires valid "op" value. Operator "${op}" not recognized.`);

        this.field = isString(field) ? field : field.name;
        this.op = op;
        this.value = value;
        this.group = group;

        Object.freeze(this);
    }

    /**
     * Generate a complete string representation suitable for consumption by parse().
     * @returns {string}
     */
    serialize() {
        const {field, op, value} = this;
        return JSON.stringify({field, op, value});
    }

    /**
     * @param {(Record|Object)} v - Record or Object to evaluate
     * @returns {boolean} - true if the provided Record/Object passes this filter based on its
     *      operator and comparison value.
     */
    test(v) {
        const {field, op} = this,
            {isRecord, store} = v;

        let value;
        if (isRecord && store) {
            v = v.get(field);

            // If the evaluation target is a Record, parse this filter's value according
            // to the Store's fieldType to ensure an accurate evaluation.
            const fieldType = store.getField(field).type;
            value = parseFieldValue(this.value, fieldType);
        } else {
            v = v[field];
            value = this.value;
        }

        switch (op) {
            case '=':
                return v === value;
            case '!=':
                return v !== value;
            case '>':
                return v > value;
            case '>=':
                return v >= value;
            case '<':
                return v < value;
            case '<=':
                return v <= value;
            case 'like':
                return new RegExp(escapeRegExp(value), 'ig').test(v);
            default:
                throw XH.exception(`Unknown operator: ${op}`);
        }
    }

    /**
     * @param {FieldFilter} other
     * @returns {boolean} - true if the other filter is fully equivalent with this instance.
     */
    equals(other) {
        return other.isFieldFilter &&
            other.serialize() === this.serialize() &&
            other.group === this.group;
    }
}
