/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {Filter, parseFilters} from '@xh/hoist/data';
import {every, some, isEmpty, isString} from 'lodash';

/**
 * Represents a collection of Filters operation, combined with either 'AND' or 'OR. Used by {@see FilterModel}.
 * Immutable.
 */
export class CompoundFilter extends Filter {

    get isCompoundFilter() {return true}

    /** @member {Filter[]} */
    filters;
    /** @member {string} */
    op;

    static OPERATORS = [
        'AND',
        'OR'
    ];

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
    constructor({
        filters,
        op,
        group = null
    }) {
        super();

        throwIf(isEmpty(filters), 'CompoundFilter requires at least one filter');
        throwIf(!CompoundFilter.isValidOperator(op), `CompoundFilter requires valid "op" value. Operator "${op}" not recognized.`);

        this.filters = parseFilters(filters);
        this.op = op;
        this.group = group;

        Object.freeze(this);
    }

    /**
     * Generate a complete string representation suitable for consumption by parse().
     * @returns {string}
     */
    serialize() {
        const {op} = this,
            filters = this.filters.map(f => f.serialize());
        return JSON.stringify({filters, op});
    }

    /**
     * @param {(Record|Object)} v - Record or Object to evaluate
     * @returns {boolean} - true if the provided Record/Object passes this filter based on its
     *      operator and filters.
     */
    test(v) {
        const {op} = this;
        switch (op) {
            case 'AND':
                return every(this.filters, f => f.test(v));
            case 'OR':
                return some(this.filters, f => f.test(v));
            default:
                throw XH.exception(`Unknown operator: ${op}`);
        }
    }

    /**
     * @param {CompoundFilter} other
     * @returns {boolean} - true if the other filter is fully equivalent with this instance.
     */
    equals(other) {
        return other.isCompoundFilter &&
            other.serialize() === this.serialize() &&
            other.group === this.group;
    }
}