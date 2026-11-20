/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isArray, isEqual} from 'lodash';
import {Aggregator} from './Aggregator';

/**
 * Sums series values point by point - such as each position's daily P&L over a window, as arrays
 * of numbers. Series of one field end on the same date, so they align from the end: a shorter
 * series lines up with the last points of a longer one.
 *
 * A null point adds nothing, and a point that no series has a value for is null. A value that is
 * not an array, or is empty, counts as no series, and a row with none is null.
 *
 * Keeps a row's series as the same array while its points do not change. Available as the
 * `SERIES_SUM` token.
 */
export class SeriesSumAggregator extends Aggregator {
    override aggregate(rows, fieldName, context) {
        const series = rows.map(it => it.data[fieldName]).filter(isSeries);
        return this.keep(sumSeries(series), context);
    }

    override replace(rows, currAgg, update, context) {
        const {oldValue, newValue} = update;
        if (!canAdjust(currAgg, oldValue, newValue)) {
            return super.replace(rows, currAgg, update, context);
        }
        const ret = [...currAgg],
            offset = ret.length - newValue.length;
        newValue.forEach((v, i) => (ret[offset + i] += v - oldValue[i]));
        return this.keep(ret, context);
    }

    // The previous series, if its points are the same, so a row with no change keeps its array.
    private keep(series: number[], context): number[] {
        const prev = context.getAggState();
        const ret = prev && isEqual(prev, series) ? prev : series;
        context.setAggState(ret);
        return ret;
    }
}

//------------------
// Implementation
//------------------
function isSeries(v: unknown): v is number[] {
    return isArray(v) && v.length > 0;
}

function sumSeries(series: number[][]): number[] {
    if (!series.length) return null;
    const length = Math.max(...series.map(it => it.length)),
        ret: number[] = new Array(length).fill(null);
    series.forEach(s => {
        const offset = length - s.length;
        s.forEach((v, i) => {
            if (v != null) ret[offset + i] = (ret[offset + i] ?? 0) + v;
        });
    });
    return ret;
}

// True if a change from one complete series to another of the same length can adjust the total
// in place: every point affected present on all three. Else the total is summed again.
function canAdjust(curr: unknown, prev: unknown, next: unknown): boolean {
    if (!isSeries(curr) || !isSeries(prev) || !isSeries(next)) return false;
    if (prev.length !== next.length || next.length > curr.length) return false;
    const offset = curr.length - next.length;
    return next.every((v, i) => v != null && prev[i] != null && curr[offset + i] != null);
}
