/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {isNil, isNumber, isString} from 'lodash';

export type GridSorterLike = GridSorterSpec | string | GridSorter;

export interface GridSorterSpec {
    colId: string;
    sort?: 'asc' | 'desc' | 'ASC' | 'DESC';
    abs?: boolean;
}

export class GridSorter {
    readonly colId: string;
    readonly sort: 'asc' | 'desc';
    readonly abs: boolean;

    /**
     * Create a new GridSorter. Accepts a GridSorter configuration or a pipe delimited string
     * generated using GridSorter.toString().
     */
    static parse(cfg: GridSorterLike) {
        if (isNil(cfg)) return null;
        if (cfg instanceof GridSorter) return cfg;
        if (isString(cfg)) {
            const [colId, sort, abs] = cfg.split('|').map(s => s.trim()) as any;
            cfg = {colId, sort, abs};
        }
        return new GridSorter(cfg);
    }

    constructor(spec: GridSorterSpec) {
        const {colId, sort = 'asc', abs = false} = spec;
        this.colId = colId;
        this.abs = !!abs;
        let sortString: any = isString(sort) ? sort.toLowerCase() : null;
        if (sortString !== 'asc' && sortString != 'desc') {
            sortString = 'asc';
        }
        this.sort = sortString;
    }

    /** Generate a delimited string representation suitable for consumption by parse().*/
    toString(): string {
        return [this.colId, this.sort, this.abs ? 'abs' : null].filter(Boolean).join('|');
    }

    /** Comparator to use with instances of GridSorter.*/
    comparator(v1, v2) {
        if (this.abs) {
            v1 = isNumber(v1) ? Math.abs(v1) : v1;
            v2 = isNumber(v2) ? Math.abs(v2) : v2;
        }
        return GridSorter.defaultComparator(v1, v2);
    }

    /** Static comparator to use when a GridSorter instance is not available.*/
    static defaultComparator(v1, v2) {
        if (isNil(v1) && isNil(v2)) return 0;
        if (isNil(v1)) return -1;
        if (isNil(v2)) return 1;

        if (v1.toNumber) v1 = v1.toNumber();
        if (v2.toNumber) v2 = v2.toNumber();

        const quickCompare = (a, b) => (a > b ? 1 : a < b ? -1 : 0);

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
