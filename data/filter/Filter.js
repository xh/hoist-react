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
     * Create a new Filter. Accepts a Filter configuration or a pipe delimited string
     * generated using Filter.toString().
     *
     * @param {Object|String} [cfg] - Filter configuration or string representation.
     */
    static parse(cfg) {
        if (isString(cfg)) {
            const [field, operator, value] = cfg.split('|');
            cfg = {field, operator, value};
        }
        return new Filter(cfg);
    }

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
        throwIf(!VALID_OPERATORS.includes(operator), `Filter requires valid operator. Operator "${operator}" not recognized.`);

        this.field = field;
        this.operator = operator;
        this.value = value;
    }

    /**
     * Generate a delimited string representation suitable for consumption by parse().
     * @returns {string}
     */
    toString() {
        return [
            this.field,
            this.operator,
            this.value
        ].join('|');
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
        return this.toString();
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