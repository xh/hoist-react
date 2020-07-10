/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {isString} from 'lodash';

export class Filter {

    field;
    operator;
    value;

    get isFilter() {return true}

    /**
     * @param {Object} c - Filter configuration.
     * @param {string} c.field - field to filter.
     * @param {string} c.operator - operator to use in filter. Must be one of the VALID_OPERATORS
     * @param {*} [c.value] - value to use with operator in filter
     */
    constructor({
        field,
        operator,
        value
    }) {
        throwIf(!isString(field), 'Filter requires a field');
        throwIf(
            !isString(operator) || !VALID_OPERATORS.includes(operator),
            `Filter requires valid operator. Operator "${operator}" not recognized.`
        );

        this.field = field;
        this.operator = operator;
        this.value = value;
    }

    /**
     * Evaluates a Record or value using the operator.
     * @param {(Record|*)} v - Record or value to evaluate
     * @returns {boolean}
     */
    fn(v) {
        const {field, operator, value} = this;

        if (v.isRecord) {
            v = v.get(field);
        }

        switch (operator) {
            case '==':
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
            default:
                throw XH.exception(`Unknown operator: ${operator}`);
        }
    }

    valueOf() {
        const {field, operator, value} = this;
        return {field, operator, value};
    }
}

const VALID_OPERATORS = [
    '==',
    '!=',
    '>',
    '>=',
    '<',
    '<='
];