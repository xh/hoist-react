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

    static OPERATORS = [
        '=',
        '!=',
        '>',
        '>=',
        '<',
        '<=',
        'in',
        'notin',
        'like'
    ];

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
     * Is the given operator valid?
     *
     * @param {string} operator
     * @returns {boolean}
     */
    static isValidOperator(operator) {
        return Filter.OPERATORS.includes(operator);
    }

    /**
     * @param {Object} c - Filter configuration.
     * @param {string} c.field - field to filter.
     * @param {string} c.operator - operator to use in filter. Must be one of the OPERATORS.
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
        throwIf(!Filter.isValidOperator(operator), `Filter requires valid operator. Operator "${operator}" not recognized.`);

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
        const {field, operator} = this;

        v = this.parseValue(v.isRecord ? v.get(field) : v[field]);

        let value;
        if (isArray(this.value)) {
            value = this.value.map(it => this.parseValue(it));
        } else {
            value = this.parseValue(this.value);
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
            case 'like':
                return new RegExp(value, 'ig').test(v);
            default:
                throw XH.exception(`Unknown operator: ${operator}`);
        }
    }

    equals(other) {
        return isEqual(this.serialize(), other.serialize());
    }

    parseValue(value) {
        return parseFieldValue(value, this.fieldType);
    }
}