/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {isNumber, isNil, isString} from 'lodash';

export class GridSorter {

    colId;
    sort;
    abs;

    /**
     * Create a new GridSorter. Accepts a GridSorter configuration or a pipe delimited string
     * generated using GridSorter.toString().
     *
     * @param {Object|String} [cfg] - GridSorter configuration or string representation.
     */
    static parse(cfg) {
        if (isString(cfg)) {
            const [colId, sort, abs] = cfg.split('|');
            cfg = {colId, sort, abs};
        }
        return new GridSorter(cfg);
    }

    /**
     * @param {Object} c - GridSorter configuration.
     * @param {string} c.colId - Column ID on which to sort.
     * @param {string} c.sort - direction of sort. Either 'asc' or 'desc'.
     * @param {boolean} [c.abs] - true to sort by absolute value.
     */
    constructor({
        colId,
        sort = 'asc',
        abs = false
    }) {
        this.colId = colId;
        this.sort = isString(sort) ? sort.toLowerCase() : null;
        this.abs = !!abs;
    }

    /**
     * Generate a delimited string representation suitable for consumption by parse().
     * @returns {string}
     */
    toString() {
        return [
            this.colId,
            this.sort,
            this.abs ? 'abs' : null
        ].filter(Boolean).join('|');
    }

    /**
     * Comparator to use with instances of GridSorter.
     */
    comparator(v1, v2) {
        if (this.abs) {
            v1 = isNumber(v1) ? Math.abs(v1) : v1;
            v2 = isNumber(v2) ? Math.abs(v2) : v2;
        }
        return GridSorter.defaultComparator(v1, v2);
    }

    /**
     * Static comparator to use when a GridSorter instance is not available.
     */
    static defaultComparator(v1, v2) {
        if (isNil(v1) && isNil(v2)) return 0;
        if (isNil(v1)) return -1;
        if (isNil(v2)) return 1;

        if (v1.toNumber) v1 = v1.toNumber();
        if (v2.toNumber) v2 = v2.toNumber();

        const quickCompare = (a, b) => a > b ? 1 : (a < b ? -1 : 0);

        if (typeof v1 === 'string') {
            try {
                return v1.localeCompare(v2);
            } catch (e) {
                // if something wrong with localeCompare, e.g. not supported
                // by browser, then just continue with the quick one.
                return quickCompare(v1, v2);
            }
        }
        return quickCompare(v1, v2);
    }
}
