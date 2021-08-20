/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {parseFilter} from './Utils';
import {Filter} from './Filter';
import {compact, every, isEmpty, isEqualWith} from 'lodash';

/**
 * Combines multiple filters (including other nested CompoundFilters) via an AND or OR operator.
 * Immutable.
 */
export class CompoundFilter extends Filter {

    get isCompoundFilter() {return true}

    /** @member {Filter[]} */
    filters;
    /** @member {string} */
    op;

    get field() {
        if (isEmpty(this.filters)) return null;
        const {field} = this.filters[0];
        if (field && every(this.filters, {field})) return field;
        return null;
    }

    /**
     * Constructor - not typically called by apps - create from config via `parseFilter()` instead.
     *
     * @param {Object} c - CompoundFilter config.
     * @param {(Filter[]|Object[])} c.filters - collection of Filters or configs to create.
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

    /** Outputs JSON appropriate for recreation via `parseFilter` */
    toJSON() {
        return {
            filters: this.filters.map(f => f.toJSON()),
            op: this.op
        };
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
        if (other === this) return true;
        return other?.isCompoundFilter &&
            other.op === this.op &&
            isEqualWith(
                other.filters,
                this.filters,
                (a, b) => a.isFilter && b.isFilter ? a.equals(b) : undefined
            );
    }
}
