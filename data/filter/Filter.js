/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {parseFieldValue} from '@xh/hoist/data';
import {isString, isEqual, isArray, castArray} from 'lodash';

/**
 * Represents a filter operation on field. Typically used by @see FilterModel to
 * produce a filtered set of Records.
 *
 * Immutable.
 */
export class Filter {

    field;
    operator;
    value;
    fieldType;

    get isFilter() {return true}

    /**
     * Create a new Filter. Accepts a Filter configuration or a string representation
     * generated using Filter.serialize().
     *
     * @param {Object|String} [cfg] - Filter configuration or string representation.
     */
    static parse(cfg) {
        if (isString(cfg)) {
            const {field, operator, value, fieldType} = JSON.parse(cfg);
            cfg = {field, operator, value, fieldType};
        }
        return new Filter(cfg);
    }

    /**
     * @param {Object} c - Filter configuration.
     * @param {string} c.field - field to filter.
     * @param {string} c.operator - operator to use in filter. Must be one of the VALID_OPERATORS.
     * @param {(*|Array)} [c.value] - value(s) to use with operator in filter.
     * @param {string} [c.fieldType] - @see Field.type for available options.
     */
    constructor({
        field,
        operator,
        value,
        fieldType = 'auto'
    }) {
        throwIf(!isString(field), 'Filter requires a field');
        throwIf(!VALID_OPERATORS.includes(operator), `Filter requires valid operator. Operator "${operator}" not recognized.`);

        this.field = field;
        this.operator = operator;
        this.value = value;
        this.fieldType = fieldType;

        Object.freeze(this);
    }

    /**
     * Generate a complete string representation suitable for consumption by parse().
     * @returns {string}
     */
    serialize() {
        const {field, operator, value, fieldType} = this;
        return JSON.stringify({field, operator, value, fieldType});
    }

    /**
     * Evaluates a Record or Object using the operator.
     * @param {(Record|Object)} v - Record or Object to evaluate
     * @returns {boolean}
     */
    test(v) {
        const {field, fieldType, operator} = this;

        v = parseFieldValue(v.isRecord ? v.get(field) : v[field], fieldType);

        let value;
        if (isArray(this.value)) {
            value = this.value.map(it => parseFieldValue(it, fieldType));
        } else {
            value = parseFieldValue(this.value, fieldType);
        }

        switch (operator) {
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
            case 'in':
                return castArray(value).includes(v);
            case 'notin':
                return !castArray(value).includes(v);
            default:
                throw XH.exception(`Unknown operator: ${operator}`);
        }
    }

    equals(other) {
        return isEqual(this.serialize(), other.serialize());
    }
}

const VALID_OPERATORS = [
    '=',
    '!=',
    '>',
    '>=',
    '<',
    '<=',
    'in',
    'notin'
];