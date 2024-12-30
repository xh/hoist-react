/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {parseFilter} from './Utils';
import {Filter} from './Filter';
import {compact, every, isEmpty, isEqualWith} from 'lodash';
import {Store} from '../Store';
import {CompoundFilterSpec, CompoundFilterOperator, FilterTestFn} from './Types';

/**
 * Combines multiple filters (including other nested CompoundFilters) via an `AND` or `OR` operator.
 * Immutable.
 */
export class CompoundFilter extends Filter {
    get isCompoundFilter() {
        return true;
    }

    readonly filters: Filter[];
    readonly op: CompoundFilterOperator;

    /** @returns the singular field this filter operates on, if consistent across all clauses. */
    get field(): string {
        if (isEmpty(this.filters)) return null;
        const {field} = this.filters[0] as any;
        if (field && every(this.filters, {field})) return field;
        return null;
    }

    /**
     * Constructor - not typically called by apps - create via {@link parseFilter} instead.
     * @internal
     */
    constructor({filters, op = 'AND'}: CompoundFilterSpec) {
        super();
        op = (op as any)?.toUpperCase();
        throwIf(op !== 'AND' && op !== 'OR', 'CompoundFilter requires "op" value of "AND" or "OR"');

        this.filters = compact(filters.map(parseFilter));
        this.op = op;
        Object.freeze(this);
    }

    //-----------------
    // Overrides
    //-----------------
    override getTestFn(store?: Store): FilterTestFn {
        const {op, filters} = this;
        if (isEmpty(filters)) return () => true;

        const tests = filters.map(f => f.getTestFn(store));
        return op === 'AND' ? r => tests.every(test => test(r)) : r => tests.some(test => test(r));
    }

    override equals(other: Filter): boolean {
        if (other === this) return true;
        return (
            other instanceof CompoundFilter &&
            other.op === this.op &&
            isEqualWith(other.filters, this.filters, (a, b) =>
                a.isFilter && b.isFilter ? a.equals(b) : undefined
            )
        );
    }

    override toJSON(): CompoundFilterSpec {
        return {
            filters: this.filters.map(f => f.toJSON()),
            op: this.op
        };
    }
}
