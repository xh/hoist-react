/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {Filter, parseFilters} from '@xh/hoist/data';
import {isString, isEmpty} from 'lodash';

/**
 * Represents a collection of Filters operation, combined with either 'AND' or 'OR. Used by {@see FilterModel}.
 * Immutable.
 */
export class CompoundFilter extends Filter {

    static OPERATORS = ['AND', 'OR'];

    get isCompoundFilter() {return true}

    /** @member {Filter[]} */
    filters;
    /** @member {string} */
    op;

    /**
     * @param {string} op
     * @returns {boolean} - true if the given operator is valid.
     */
    static isValidOperator(op) {
        return CompoundFilter.OPERATORS.includes(op);
    }

    /**
     * Create a new CompoundFilter. Accepts a CompoundFilter configuration or a string representation
     * generated using CompoundFilter.serialize().
     *
     * @param {(Object|string)} cfg - CompoundFilter configuration as object or serialized JSON string.
     */
    static create(cfg) {
        if (isString(cfg)) {
            cfg = JSON.parse(cfg);
        }
        return new CompoundFilter(cfg);
    }

    /**
     * @param {Object} c - CompoundFilter configuration.
     * @param {Filter[]|Object[]} c.filters - collection of Filters, or configs to create.
     * @param {string} c.op - operator to use in filter. Must be one of the OPERATORS.
     * @param {string} [c.group] - Optional group associated with this filter.
     */
    constructor({filters, op, group = null}) {
        super();

        throwIf(isEmpty(filters), 'CompoundFilter requires at least one filter');
        throwIf(!CompoundFilter.isValidOperator(op),
            `CompoundFilter requires valid "op" value. Operator "${op}" not recognized.`
        );

        this.filters = parseFilters(filters);
        this.op = op;
        this.group = group;

        Object.freeze(this);
    }


    //-----------------
    // Overrides
    //-----------------
    serialize() {
        const {op} = this,
            filters = this.filters.map(f => f.serialize());
        return JSON.stringify({filters, op});
    }

    getTestFn(store) {
        const {op, filters} = this,
            tests = filters.map(f => f.getTestFn(store));
        switch (op) {
            case 'AND':
                return r => tests.every(test => test(r));
            case 'OR':
                return r => tests.some(test => test(r));
            default:
                throw XH.exception(`Unknown operator: ${op}`);
        }
    }

    equals(other) {
        return other.isCompoundFilter &&
            other.serialize() === this.serialize() &&
            other.group === this.group;
    }
}