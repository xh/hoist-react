/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {first, includes, isFinite, isFunction, last, maxBy, minBy, partition} from 'lodash';
import type {ReactElement} from 'react';

import {div, path, span, svg} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import type {
    DomAttrsProps,
    HoistProps,
    Intent,
    LayoutProps,
    TestSupportProps
} from '@xh/hoist/core';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import {
    scaleY,
    sparklineAreaPath,
    sparklineBars,
    sparklineBarsPath,
    sparklineDomain,
    sparklineLabel,
    sparklineLinePath,
    sparklinePoints,
    VIEW_SIZE
} from './impl/SparklineGeometry';
import type {SparklinePoint} from './impl/SparklineGeometry';
import './Sparkline.scss';

export type SparklineType = 'line' | 'area' | 'bar';

/** A value to mark with a dot: the first, the last, the lowest or the highest. */
export type SparklineMarker = 'first' | 'last' | 'min' | 'max';

/**
 * Function to build a Sparkline's tooltip.
 * @param data - the series, as passed to the component.
 * @returns the text to show on hover, or null for no tooltip.
 */
export type SparklineTooltipFn = (data: number[]) => string;

export interface SparklineProps extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /**
     * The series to draw, in order. A null, undefined or NaN entry is a gap: a line breaks there
     * and a bar leaves its space empty. An empty series draws an empty box of the same size.
     * The array is not observed - pass a new one to redraw.
     */
    data: number[];

    /**
     * Shape of the series. Default `line`.
     *
     * - `line` - a line through the values.
     * - `area` - a line, filled down to the bottom of the box.
     * - `bar` - a bar per value. A bar grows up or down from zero, or from `baseline` if set.
     */
    type?: SparklineType;

    /**
     * Semantic color for the series. Default is the neutral `--xh-sparkline-color`. For any other
     * color, set that CSS variable or the CSS `color` of the component.
     */
    intent?: Intent;

    /**
     * True to color the series by its direction: the positive value color if the last value is
     * above the first, the negative value color if it is below. These are the colors of the
     * `xh-pos-val` and `xh-neg-val` classes. Ignored when `intent` is set.
     */
    colorByTrend?: boolean;

    /**
     * True to draw each bar below zero, or below `baseline` if set, in the negative value color.
     * Applies to the `bar` type only.
     */
    colorNegative?: boolean;

    /**
     * Values to mark with a dot. The `min` and `max` dots use the negative and positive value
     * colors, and show only when the series is not flat. Applies to the `line` and `area` types.
     * A lone value always shows as a dot.
     */
    markers?: SparklineMarker[];

    /**
     * Value to draw a reference line at, such as zero or a prior close. The scale extends to
     * take it in, unless `min` or `max` fixes that side.
     */
    baseline?: number;

    /**
     * Lowest value of the scale. Default is the lowest value in the series. Set `min` and `max`
     * to draw several sparklines on one scale, such as those in a grid column. A value outside
     * the scale draws at the nearer edge.
     */
    min?: number;

    /** Highest value of the scale. Default is the highest value in the series. */
    max?: number;

    /**
     * Native browser tooltip to show on hover, or a function to build it from the data. Default
     * none.
     */
    tooltip?: string | SparklineTooltipFn;
}

/**
 * A small inline chart of a trend, with no axes or labels - the line beside a key figure, or the
 * trend cell in a grid row.
 *
 * Draws plain SVG with no charting library, so it is cheap enough to render in every row of a
 * grid. Use a `Chart` for anything a reader must take exact values from.
 *
 * Renders inline at a small fixed size by default, set by the `--xh-sparkline-width` and
 * `--xh-sparkline-height` CSS variables. Pass layout props to size it - `width: '100%'` or
 * `flex: 1` stretches it to its container, and the line keeps its thickness.
 *
 * The component has the `img` role, with a summary of the series as its accessible name, such as
 * "Trend: 12 points, from 101 to 118". The summary does not format numbers. To name the metric
 * or round its values, pass a name of your own as `domAttrs: {'aria-label': ...}`.
 */
export const [Sparkline, sparkline] = hoistCmp.withFactory<SparklineProps>({
    displayName: 'Sparkline',
    model: false,
    observer: false,
    className: 'xh-sparkline',

    render(props, ref) {
        const [
                layoutProps,
                {
                    className,
                    data,
                    type,
                    intent,
                    colorByTrend,
                    colorNegative,
                    markers,
                    baseline,
                    min,
                    max,
                    tooltip,
                    testId,
                    domAttrs
                }
            ] = splitLayoutProps(props),
            shape = type ?? 'line',
            isBar = shape === 'bar',
            origin = isFinite(baseline) ? baseline : 0,
            domain = sparklineDomain(data, {
                min,
                max,
                include: isBar ? [origin] : [baseline]
            }),
            points = sparklinePoints(data, domain),
            divProps = mergeDeep(
                {
                    className: classNames(
                        className,
                        `xh-sparkline--${shape}`,
                        intent
                            ? `xh-sparkline--intent-${intent}`
                            : colorByTrend && trendClass(points)
                    )
                },
                {style: layoutProps},
                {[TEST_ID]: testId, ...domAttrs}
            );

        return div({
            ref,
            role: 'img',
            title: isFunction(tooltip) ? tooltip(data) : tooltip,
            ...divProps,
            'aria-label': String(domAttrs?.['aria-label'] ?? sparklineLabel(data)),
            item: div({
                className: 'xh-sparkline__plot',
                items: [
                    svg({
                        className: 'xh-sparkline__svg',
                        viewBox: `0 0 ${VIEW_SIZE} ${VIEW_SIZE}`,
                        preserveAspectRatio: 'none',
                        focusable: false,
                        'aria-hidden': true,
                        items: [
                            ...(isBar
                                ? barShapes(data, domain, origin, colorNegative)
                                : lineShapes(points, shape === 'area')),
                            baselineShape(baseline, domain)
                        ]
                    }),
                    ...(isBar ? [] : dots(points, markers))
                ]
            })
        });
    }
});

//------------------
// Implementation
//------------------
function lineShapes(points: SparklinePoint[], withArea: boolean): ReactElement[] {
    // A lone value has no line to draw, and shows as a dot instead.
    if (points.length < 2) return [];
    return [
        withArea ? shapePath('area', sparklineAreaPath(points)) : null,
        shapePath('line', sparklineLinePath(points))
    ];
}

function barShapes(
    data: number[],
    domain: [number, number],
    origin: number,
    colorNegative: boolean
): ReactElement[] {
    const bars = sparklineBars(data, domain, origin),
        [negative, positive] = partition(bars, bar => colorNegative && bar.negative);
    return [
        shapePath('bars', sparklineBarsPath(positive)),
        shapePath('bars xh-sparkline__bars--negative', sparklineBarsPath(negative))
    ];
}

function baselineShape(baseline: number, domain: [number, number]): ReactElement {
    if (!isFinite(baseline) || !domain || baseline < domain[0] || baseline > domain[1]) return null;
    return shapePath('baseline', `M0 ${scaleY(baseline, domain)}h${VIEW_SIZE}`);
}

/**
 * A stroke that keeps its thickness when the box stretches the SVG, set as an attribute for the
 * widest browser support. Returns null for an empty path.
 */
function shapePath(name: string, d: string): ReactElement {
    if (!d) return null;
    return path({
        key: name,
        className: `xh-sparkline__${name}`,
        d,
        vectorEffect: 'non-scaling-stroke'
    });
}

/**
 * Dots are HTML elements placed over the SVG by percentage, not SVG circles. A circle would
 * stretch to an ellipse with the box.
 */
function dots(points: SparklinePoint[], markers: SparklineMarker[]): ReactElement[] {
    if (points.length === 1) return [dot('last', points[0])];
    if (points.length === 0) return [];

    const lowest = minBy(points, 'value'),
        highest = maxBy(points, 'value'),
        hasRange = lowest.value !== highest.value,
        has = (marker: SparklineMarker) => includes(markers, marker);
    return [
        has('first') ? dot('first', first(points)) : null,
        has('min') && hasRange ? dot('min', lowest) : null,
        has('max') && hasRange ? dot('max', highest) : null,
        has('last') ? dot('last', last(points)) : null
    ];
}

function dot(name: string, {x, y}: SparklinePoint): ReactElement {
    return span({
        key: name,
        className: `xh-sparkline__dot xh-sparkline__dot--${name}`,
        style: {left: `${x}%`, top: `${y}%`}
    });
}

function trendClass(points: SparklinePoint[]): string {
    if (points.length < 2) return null;
    const change = last(points).value - first(points).value;
    return change > 0 ? 'xh-sparkline--trend-up' : change < 0 ? 'xh-sparkline--trend-down' : null;
}
