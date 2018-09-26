/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Utils} from 'ag-grid';

export class GridSorter {

    colId;
    sort;
    abs;

    /**
     * @param {Object} c - GridSorter configuration.
     * @param {string} c.colId - Column ID on which to sort.
     * @param {string} c.sort - direction of sort. Either 'asc' or 'desc'.
     * @param {boolean} [c.abs] - true to sort by absolute value.
     */
    constructor({
        colId,
        sort,
        abs = false
    }) {
        this.colId = colId;
        this.sort = sort;
        this.abs = abs;
    }

    comparator(v1, v2) {
        if (this.abs) {
            return Math.abs(v1) - Math.abs(v2);
        } else {
            return Utils.defaultComparator(v1, v2);
        }
    }

}