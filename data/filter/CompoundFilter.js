/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {parseFilter} from './Utils';
import {Filter} from './Filter';
import {compact, isString, isArray} from 'lodash';

/**
 * Represents a collection of Filters combined with either 'AND' or 'OR.
 * Immutable.
 */
export class CompoundFilter extends Filter {

    get isCompoundFilter() {return true}

    /** @member {Filter[]} */
    filters;
    /** @member {string} */
    op;

    /**
     * Create a new CompoundFilter.  Accepts a CompoundFilter configuration or a string representation
     * generated using CompoundFilter.serialize().
     *
     * @param {(Object|string)|*[]} cfg - CompoundFilter configuration object, serialized JSON
     *      string, or array of Filter configs.
     */
    static create(cfg) {
        if (isString(cfg)) {
            cfg = JSON.parse(cfg);
        }
        if (isArray(cfg)) {
            cfg = {filters: cfg};
        }
        return new CompoundFilter(cfg);
    }

    /**
     * @param {Object} c - CompoundFilter configuration.
     * @param {Filter[]|Object[]} c.filters - collection of Filters, or configs to create.
     * @param {string} [c.op] - logical operator 'AND' (default) or 'OR'
     */
    constructor({filters, op = 'AND'}) {
        super();
        op = op?.toUpperCase();
        throwIf(op !== 'AND' && op !== 'OR', 'CompoundFilter requires "op" value of "AND" or "OR"');

        this.filters = compact(filters.map(parseFilter));
        this.op = op;
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
        return op === 'AND' ?
            r => tests.every(test => test(r)) :
            r => tests.some(test => test(r));
    }

    equals(other) {
        return other.isCompoundFilter && other.serialize() === this.serialize();
    }
}