/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    scaleY,
    sparklineAreaPath,
    sparklineBars,
    sparklineBarsPath,
    sparklineDomain,
    sparklineLabel,
    sparklineLinePath,
    sparklinePoints,
    usableValues
} from '@xh/hoist/cmp/sparkline/impl/SparklineGeometry';
import {describe, expect, it} from 'vitest';

/**
 * A Sparkline draws whatever series an app has, including partial and odd ones: gaps, one value,
 * no values, a flat run. This geometry must place each of those in the view without a NaN or an
 * error, as a bad coordinate would draw nothing at all.
 */
describe('SparklineGeometry', () => {
    describe('usableValues', () => {
        it('treats null, undefined, NaN and infinite entries as gaps, keeping each index', () => {
            expect(usableValues([1, null, undefined, NaN, Infinity, 5])).toEqual([
                {index: 0, value: 1},
                {index: 5, value: 5}
            ]);
        });

        it('returns nothing for an empty or missing series', () => {
            expect(usableValues([])).toEqual([]);
            expect(usableValues(null)).toEqual([]);
        });
    });

    describe('sparklineDomain', () => {
        it('spans the data by default, ignoring gaps', () => {
            expect(sparklineDomain([3, null, -2, 8])).toEqual([-2, 8]);
        });

        it('lets a fixed bound win over the data, on either side', () => {
            expect(sparklineDomain([3, 8], {min: 0})).toEqual([0, 8]);
            expect(sparklineDomain([3, 8], {max: 100})).toEqual([3, 100]);
            expect(sparklineDomain([3, 8], {min: 5, max: 6})).toEqual([5, 6]);
        });

        it('extends an open bound to take in a baseline, but not a fixed one', () => {
            expect(sparklineDomain([3, 8], {include: [0]})).toEqual([0, 8]);
            expect(sparklineDomain([3, 8], {min: 2, include: [0]})).toEqual([2, 8]);
        });

        it('orders bounds given the wrong way round', () => {
            expect(sparklineDomain([3, 8], {min: 10, max: 0})).toEqual([0, 10]);
        });

        it('is null with no data and no fixed bounds', () => {
            expect(sparklineDomain([])).toBeNull();
            expect(sparklineDomain([null, NaN])).toBeNull();
        });
    });

    describe('scaleY', () => {
        it('puts the top of the domain at 0 and the bottom at 100', () => {
            expect(scaleY(10, [0, 10])).toBe(0);
            expect(scaleY(0, [0, 10])).toBe(100);
            expect(scaleY(2.5, [0, 10])).toBe(75);
        });

        it('centers every value of a flat domain, without dividing by zero', () => {
            expect(scaleY(7, [7, 7])).toBe(50);
            expect(scaleY(7, null)).toBe(50);
        });

        it('holds a value outside a fixed domain on the nearer edge', () => {
            expect(scaleY(50, [0, 10])).toBe(0);
            expect(scaleY(-50, [0, 10])).toBe(100);
        });
    });

    describe('sparklinePoints', () => {
        it('spreads values across the width by index', () => {
            const points = sparklinePoints([0, 5, 10], [0, 10]);
            expect(points.map(pt => [pt.x, pt.y])).toEqual([
                [0, 100],
                [50, 50],
                [100, 0]
            ]);
        });

        it('keeps the space of a gap empty', () => {
            const points = sparklinePoints([0, null, 10], [0, 10]);
            expect(points.map(pt => pt.x)).toEqual([0, 100]);
        });

        it('centers a single value', () => {
            expect(sparklinePoints([42], [42, 42])).toEqual([{index: 0, value: 42, x: 50, y: 50}]);
        });

        it('returns no points for an empty series', () => {
            expect(sparklinePoints([], null)).toEqual([]);
        });
    });

    describe('sparklineLinePath', () => {
        it('draws one line through consecutive values', () => {
            expect(line([0, 5, 10])).toBe('M0 100L50 50L100 0');
        });

        it('breaks the line at a gap', () => {
            expect(line([0, 10, null, 10, 0])).toBe('M0 100L25 0M75 0L100 100');
        });

        it('draws a value between two gaps as a zero-length segment', () => {
            expect(line([0, null, 10, null, 0])).toBe('M0 100h0M50 0h0M100 100h0');
        });

        it('draws a flat series along the center', () => {
            expect(line([4, 4, 4])).toBe('M0 50L50 50L100 50');
        });

        it('is empty for an empty series', () => {
            expect(line([])).toBe('');
        });
    });

    describe('sparklineAreaPath', () => {
        it('closes each run of values down to the bottom of the view', () => {
            const points = sparklinePoints([0, 10, null, 10, 0], [0, 10]);
            expect(sparklineAreaPath(points)).toBe(
                'M0 100L0 100L25 0L25 100ZM75 100L75 0L100 100L100 100Z'
            );
        });

        it('has no shape for a lone value', () => {
            expect(sparklineAreaPath(sparklinePoints([5], [5, 5]))).toBe('');
        });
    });

    describe('sparklineBars', () => {
        it('gives each value an equal slot, with space between bars', () => {
            const bars = sparklineBars([10, 5], [0, 10]);
            expect(bars.map(bar => [bar.x, bar.width])).toEqual([
                [5, 40],
                [55, 40]
            ]);
            expect(bars.map(bar => [bar.y, bar.height])).toEqual([
                [0, 100],
                [50, 50]
            ]);
        });

        it('draws a negative value below zero', () => {
            const [up, down] = sparklineBars([10, -10], [-10, 10]);
            expect(up).toMatchObject({y: 0, height: 50, negative: false});
            expect(down).toMatchObject({y: 50, height: 50, negative: true});
        });

        it('grows bars from a given origin', () => {
            const [up, down] = sparklineBars([110, 95], [90, 110], 100);
            expect(up).toMatchObject({y: 0, height: 50, negative: false});
            expect(down).toMatchObject({y: 50, height: 25, negative: true});
        });

        it('leaves the slot of a gap empty', () => {
            const bars = sparklineBars([1, null, 1], [0, 1]);
            expect(bars.map(bar => bar.index)).toEqual([0, 2]);
        });

        it('gives a zero value a bar of no height, left out of the path', () => {
            const bars = sparklineBars([0, 10], [0, 10]);
            expect(bars[0].height).toBe(0);
            expect(sparklineBarsPath(bars)).toBe('M55 0h40v100h-40Z');
        });

        it('returns no bars for an empty series', () => {
            expect(sparklineBars([], null)).toEqual([]);
            expect(sparklineBarsPath([])).toBe('');
        });
    });

    describe('sparklineLabel', () => {
        it.each([
            [[101, 105, 118], 'Trend: 3 points, from 101 to 118'],
            [[null, 101, NaN, 118, null], 'Trend: 2 points, from 101 to 118'],
            [[0.1 + 0.2, 1], 'Trend: 2 points, from 0.3 to 1'],
            [[42], 'Trend: 1 point, 42'],
            [[], 'Trend: no data'],
            [null, 'Trend: no data']
        ])('summarizes %j as "%s"', (values, expected) => {
            expect(sparklineLabel(values)).toBe(expected);
        });
    });
});

function line(values: number[]): string {
    return sparklineLinePath(sparklinePoints(values, sparklineDomain(values)));
}
