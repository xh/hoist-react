/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    clamp,
    first,
    isArray,
    isEmpty,
    isFinite,
    last,
    max as maxOf,
    min as minOf,
    round
} from 'lodash';

/**
 * Side of the square coordinate space that the geometry is drawn in. The SVG stretches this space
 * to its box, so x and y are in effect percentages of the plot's width and height.
 */
export const VIEW_SIZE = 100;

/** Share of a bar's slot left empty, as the space between bars. */
const BAR_GAP = 0.2;

/** A usable value, placed in the view. A gap in the source values has no point. */
export interface SparklinePoint {
    /** Index of the value in the source array. */
    index: number;
    value: number;
    x: number;
    y: number;
}

/** A bar, as a rectangle in the view. */
export interface SparklineBar {
    index: number;
    value: number;
    x: number;
    y: number;
    width: number;
    height: number;
    /** True if the value is below the value that bars grow from. */
    negative: boolean;
}

export interface SparklineDomainOptions {
    /** Fixed lower bound. Default is the lowest value. */
    min?: number;
    /** Fixed upper bound. Default is the highest value. */
    max?: number;
    /** Values that an open bound must take in, such as a baseline. */
    include?: number[];
}

/** The usable entries of `values`. A null, undefined, NaN or infinite entry is a gap. */
export function usableValues(values: number[]): Array<{index: number; value: number}> {
    if (!isArray(values)) return [];
    return values.flatMap((value, index) => (isFinite(value) ? [{index, value}] : []));
}

/**
 * The `[min, max]` that the view's height spans. A fixed bound wins over the data. Returns null
 * when there is nothing to span.
 */
export function sparklineDomain(
    values: number[],
    {min, max, include = []}: SparklineDomainOptions = {}
): [number, number] {
    const data = [...usableValues(values).map(it => it.value), ...include.filter(isFinite)],
        lo = isFinite(min) ? min : isEmpty(data) ? max : minOf(data),
        hi = isFinite(max) ? max : isEmpty(data) ? min : maxOf(data);

    if (!isFinite(lo) || !isFinite(hi)) return null;
    return [Math.min(lo, hi), Math.max(lo, hi)];
}

/**
 * The y of a value: 0 at the top of the domain and `VIEW_SIZE` at the bottom. A value outside
 * the domain sits on the nearer edge. Every value sits on the center line if the domain is flat.
 */
export function scaleY(value: number, domain: [number, number]): number {
    const [min, max] = domain ?? [0, 0];
    if (max === min) return VIEW_SIZE / 2;
    return round(clamp(((max - value) / (max - min)) * VIEW_SIZE, 0, VIEW_SIZE), 2);
}

/**
 * The points of a line. Each value keeps the x of its own index, so a gap leaves its space empty.
 * A single value sits at the center.
 */
export function sparklinePoints(values: number[], domain: [number, number]): SparklinePoint[] {
    const count = isArray(values) ? values.length : 0;
    return usableValues(values).map(({index, value}) => ({
        index,
        value,
        x: count > 1 ? round((index / (count - 1)) * VIEW_SIZE, 2) : VIEW_SIZE / 2,
        y: scaleY(value, domain)
    }));
}

/**
 * SVG path data for a line through the points, broken at each gap. A point with a gap on both
 * sides draws as a zero-length segment, which shows as a dot under a round line cap.
 */
export function sparklineLinePath(points: SparklinePoint[]): string {
    return runs(points)
        .map(run => {
            const [start, ...rest] = run;
            return isEmpty(rest)
                ? `M${start.x} ${start.y}h0`
                : `M${start.x} ${start.y}` + rest.map(pt => `L${pt.x} ${pt.y}`).join('');
        })
        .join('');
}

/** SVG path data for the fill between the line and the bottom of the view, one shape per run. */
export function sparklineAreaPath(points: SparklinePoint[]): string {
    return runs(points)
        .filter(run => run.length > 1)
        .map(run => {
            const line = run.map(pt => `L${pt.x} ${pt.y}`).join('');
            return `M${first(run).x} ${VIEW_SIZE}${line}L${last(run).x} ${VIEW_SIZE}Z`;
        })
        .join('');
}

/**
 * The bars of a series, each in an equal slot of the view's width. A bar grows from `origin`,
 * up for a greater value and down for a lesser one.
 */
export function sparklineBars(
    values: number[],
    domain: [number, number],
    origin: number = 0
): SparklineBar[] {
    const count = isArray(values) ? values.length : 0,
        slot = VIEW_SIZE / Math.max(count, 1),
        width = round(slot * (1 - BAR_GAP), 2),
        originY = scaleY(origin, domain);

    return usableValues(values).map(({index, value}) => {
        const y = scaleY(value, domain);
        return {
            index,
            value,
            x: round(index * slot + (slot * BAR_GAP) / 2, 2),
            y: Math.min(y, originY),
            width,
            height: round(Math.abs(y - originY), 2),
            negative: value < origin
        };
    });
}

/** SVG path data that draws each bar as a closed rectangle. */
export function sparklineBarsPath(bars: SparklineBar[]): string {
    return bars
        .filter(bar => bar.height > 0)
        .map(({x, y, width, height}) => `M${x} ${y}h${width}v${height}h${-width}Z`)
        .join('');
}

/** A plain-text summary of a series, for use as its accessible name. */
export function sparklineLabel(values: number[]): string {
    const usable = usableValues(values).map(it => fmt(it.value)),
        count = usable.length;

    if (count === 0) return 'Trend: no data';
    if (count === 1) return `Trend: 1 point, ${usable[0]}`;
    return `Trend: ${count} points, from ${first(usable)} to ${last(usable)}`;
}

//------------------
// Implementation
//------------------
/** Points split into runs of consecutive indexes. */
function runs(points: SparklinePoint[]): SparklinePoint[][] {
    const ret: SparklinePoint[][] = [];
    points.forEach(pt => {
        const run = last(ret);
        if (run && last(run).index === pt.index - 1) {
            run.push(pt);
        } else {
            ret.push([pt]);
        }
    });
    return ret;
}

/** Drops binary floating-point noise, such as 0.30000000000000004. */
function fmt(value: number): string {
    return String(parseFloat(value.toPrecision(12)));
}
