/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {parseFilter} from './Utils';
import {Filter} from './Filter';
import {compact, isEmpty, isEqualWith} from 'lodash';

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
     * Construct this object.
     *
     * Not typically called directly by applications.  Create from config using parseFilter()
     * instead.
     *
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
    getTestFn(store) {
        const {op, filters} = this;
        if (isEmpty(filters)) return () => true;

        const tests = filters.map(f => f.getTestFn(store));
        return op === 'AND' ?
            r => tests.every(test => test(r)) :
            r => tests.some(test => test(r));
    }

    equals(other) {
        return other?.isCompoundFilter &&
            other.op === this.op &&
            isEqualWith(
                other.filters,
                this.filters,
                (a, b) => a.isFilter && b.isFilter ? a.equals(b) : undefined
            );
    }
}