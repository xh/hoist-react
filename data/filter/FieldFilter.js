/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {FieldType, parseFieldValue} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {castArray, escapeRegExp, isArray, isString} from 'lodash';

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
    operator;
    /** @member {(*|[])} */
    value;
    /** @member {FieldType} */
    fieldType;

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
     * @param {string} operator
     * @returns {boolean} - true if the given operator is valid.
     */
    static isValidOperator(operator) {
        return FieldFilter.OPERATORS.includes(operator);
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
     * @param {string} c.operator - operator to use in filter. Must be one of the OPERATORS.
     * @param {(*|[])} [c.value] - value(s) to use with operator in filter.
     * @param {FieldType} [c.fieldType]
     * @param {string} [c.group] - Optional group associated with this filter.
     */
    constructor({
        field,
        operator,
        value,
        fieldType = FieldType.AUTO,
        group = null
    }) {
        super();

        throwIf(!field, 'FieldFilter requires a field');
        throwIf(!FieldFilter.isValidOperator(operator), `FieldFilter requires valid operator. Operator "${operator}" not recognized.`);

        this.field = isString(field) ? field : field.name;
        this.operator = operator;
        this.value = value;
        this.fieldType = fieldType;
        this.group = group;

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
     * @param {(Record|Object)} v - Record or Object to evaluate
     * @returns {boolean} - true if the provided Record/Object passes this filter based on its
     *      operator and comparison value(s).
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
                return new RegExp(escapeRegExp(value), 'ig').test(v);
            default:
                throw XH.exception(`Unknown operator: ${operator}`);
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

    parseValue(value) {
        return parseFieldValue(value, this.fieldType);
    }
}
