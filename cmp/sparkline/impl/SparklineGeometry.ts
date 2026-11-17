/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {clamp, first, isEmpty, isFinite, last, max as maxOf, min as minOf, round} from 'lodash';

/**
 * Side of the square coordinate space that the geometry is drawn in. The SVG stretches this space
 * to its box, so x and y are in effect percentages of the plot's width and height.
 */
export const VIEW_SIZE = 100;

/** Share of a bar's slot left empty, as the space between bars. */
const BAR_GAP = 0.2;

/** A usable value, placed in the view. A gap in the data has no point. */
export interface SparklinePoint {
    /**
     * Index of the value in the data. Fractional for a point added where a line crosses its
     * origin - see {@link sparklineSegments}.
     */
    index: number;
    value: number;
    x: number;
    y: number;
}

/** A stretch of a line that lies on one side of its origin. */
export interface SparklineSegment {
    points: SparklinePoint[];
    /** True if the stretch lies below the origin. */
    negative: boolean;
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

/** The usable entries of `data`. A null, undefined, NaN or infinite entry is a gap. */
export function usableValues(data: number[]): Array<{index: number; value: number}> {
    return (data ?? []).flatMap((value, index) => (isFinite(value) ? [{index, value}] : []));
}

/**
 * The `[min, max]` that the view's height spans. A fixed bound wins over the data. Returns null
 * when there is nothing to span.
 */
export function sparklineDomain(
    data: number[],
    {min, max, include = []}: SparklineDomainOptions = {}
): [number, number] {
    const vals = [...usableValues(data).map(it => it.value), ...include.filter(isFinite)],
        lo = isFinite(min) ? min : isEmpty(vals) ? max : minOf(vals),
        hi = isFinite(max) ? max : isEmpty(vals) ? min : maxOf(vals);

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
export function sparklinePoints(data: number[], domain: [number, number]): SparklinePoint[] {
    const count = data?.length ?? 0;
    return usableValues(data).map(({index, value}) => ({
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

/**
 * SVG path data for the fill between the line and `floorY`, one shape per run. The floor defaults
 * to the bottom of the view.
 */
export function sparklineAreaPath(points: SparklinePoint[], floorY: number = VIEW_SIZE): string {
    return runs(points)
        .filter(run => run.length > 1)
        .map(run => {
            const line = run.map(pt => `L${pt.x} ${pt.y}`).join('');
            return `M${first(run).x} ${floorY}${line}L${last(run).x} ${floorY}Z`;
        })
        .join('');
}

/**
 * The runs of a line, cut where it crosses `origin`, so each side can draw in its own color. A
 * cut adds a point on the origin, which ends one segment and starts the next. A value exactly on
 * the origin is itself the cut. Each segment draws as one run, with no gap inside it.
 */
export function sparklineSegments(
    points: SparklinePoint[],
    domain: [number, number],
    origin: number
): SparklineSegment[] {
    return runs(points).flatMap(run => {
        const ret: SparklineSegment[] = [];
        // Side of the current segment: 0 while it has only touched the origin.
        let side = 0;
        run.forEach((pt, idx) => {
            const ptSide = Math.sign(pt.value - origin),
                segment = last(ret);
            if (idx === 0) {
                ret.push({points: [pt], negative: ptSide < 0});
            } else if (ptSide === 0 || side === 0 || ptSide === side) {
                segment.points.push(pt);
                if (side === 0) segment.negative = ptSide < 0;
            } else {
                // The line crosses over: end this segment on the origin and start the next there.
                const prev = last(segment.points),
                    cut = prev.value === origin ? prev : crossing(prev, pt, origin, domain);
                if (cut !== prev) segment.points.push(cut);
                ret.push({points: [cut, pt], negative: ptSide < 0});
            }
            if (ptSide !== 0) side = ptSide;
        });
        return ret;
    });
}

/**
 * The bars of a series, each in an equal slot of the view's width. A bar grows from `origin`,
 * up for a greater value and down for a lesser one.
 */
export function sparklineBars(
    data: number[],
    domain: [number, number],
    origin: number = 0
): SparklineBar[] {
    const count = data?.length ?? 0,
        slot = VIEW_SIZE / Math.max(count, 1),
        width = round(slot * (1 - BAR_GAP), 2),
        originY = scaleY(origin, domain);

    return usableValues(data).map(({index, value}) => {
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
export function sparklineLabel(data: number[]): string {
    const usable = usableValues(data).map(it => fmt(it.value)),
        count = usable.length;

    if (count === 0) return 'Trend: no data';
    if (count === 1) return `Trend: 1 point, ${usable[0]}`;
    return `Trend: ${count} points, from ${first(usable)} to ${last(usable)}`;
}

//------------------
// Implementation
//------------------
/**
 * Points split into runs at each gap. Indexes within a run step by at most 1, which keeps a
 * crossing point with a fractional index in its run.
 */
function runs(points: SparklinePoint[]): SparklinePoint[][] {
    const ret: SparklinePoint[][] = [];
    points.forEach(pt => {
        const run = last(ret);
        if (run && pt.index - last(run).index <= 1) {
            run.push(pt);
        } else {
            ret.push([pt]);
        }
    });
    return ret;
}

/** The point where the straight line from `a` to `b` meets `origin`. */
function crossing(
    a: SparklinePoint,
    b: SparklinePoint,
    origin: number,
    domain: [number, number]
): SparklinePoint {
    const t = (origin - a.value) / (b.value - a.value);
    return {
        index: a.index + t,
        value: origin,
        x: round(a.x + t * (b.x - a.x), 2),
        y: scaleY(origin, domain)
    };
}

/** Drops binary floating-point noise, such as 0.30000000000000004. */
function fmt(value: number): string {
    return String(parseFloat(value.toPrecision(12)));
}
