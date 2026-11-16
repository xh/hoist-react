/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {first, isFinite, last, maxBy, minBy, partition} from 'lodash';
import {createElement} from 'react';
import type {ReactElement} from 'react';

import {div, span, svg} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import type {
    DomAttrsProps,
    HoistProps,
    Intent,
    LayoutProps,
    TestSupportProps
} from '@xh/hoist/core';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {isBlankNode, splitLayoutProps} from '@xh/hoist/utils/react';

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

export interface SparklineProps extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /**
     * The series to draw, in order. A null, undefined or NaN entry is a gap: a line breaks there
     * and a bar leaves its space empty. An empty series draws an empty box of the same size.
     */
    values: number[];

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

    /** True to mark the last value with a dot. Applies to the `line` and `area` types. */
    showLast?: boolean;

    /**
     * True to mark the lowest and highest values with a dot each, in the negative and positive
     * value colors. Applies to the `line` and `area` types.
     */
    showMinMax?: boolean;

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
     * True to show the accessible name as a native browser tooltip on hover, or a string to show
     * in its place. Default false. A blank string shows no tooltip.
     */
    tooltip?: boolean | string;
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
    className: 'xh-sparkline',

    render(props, ref) {
        const [
                layoutProps,
                {
                    className,
                    values,
                    type,
                    intent,
                    colorByTrend,
                    colorNegative,
                    showLast,
                    showMinMax,
                    baseline,
                    min,
                    max,
                    tooltip,
                    testId,
                    domAttrs
                }
            ] = splitLayoutProps(props),
            isBar = type === 'bar',
            origin = isFinite(baseline) ? baseline : 0,
            domain = sparklineDomain(values, {
                min,
                max,
                include: isBar ? [origin] : [baseline]
            }),
            points = sparklinePoints(values, domain),
            ariaLabel = String(domAttrs?.['aria-label'] ?? sparklineLabel(values)),
            title = tooltip === true ? ariaLabel : isBlankNode(tooltip) ? null : `${tooltip}`,
            divProps = mergeDeep(
                {
                    className: classNames(
                        className,
                        `xh-sparkline--${isBar ? 'bar' : type === 'area' ? 'area' : 'line'}`,
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
            title,
            ...divProps,
            'aria-label': ariaLabel,
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
                                ? barShapes(values, domain, origin, colorNegative)
                                : lineShapes(points, type === 'area')),
                            baselineShape(baseline, domain)
                        ]
                    }),
                    ...(isBar ? [] : dots(points, showLast, showMinMax))
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
        withArea ? path('area', sparklineAreaPath(points)) : null,
        path('line', sparklineLinePath(points))
    ];
}

function barShapes(
    values: number[],
    domain: [number, number],
    origin: number,
    colorNegative: boolean
): ReactElement[] {
    const bars = sparklineBars(values, domain, origin),
        [negative, positive] = partition(bars, bar => colorNegative && bar.negative);
    return [
        path('bars', sparklineBarsPath(positive)),
        path('bars xh-sparkline__bars--negative', sparklineBarsPath(negative))
    ];
}

function baselineShape(baseline: number, domain: [number, number]): ReactElement {
    if (!isFinite(baseline) || !domain || baseline < domain[0] || baseline > domain[1]) return null;
    return path('baseline', `M0 ${scaleY(baseline, domain)}h${VIEW_SIZE}`);
}

/**
 * A stroke that keeps its thickness when the box stretches the SVG, set as an attribute for the
 * widest browser support. Returns null for an empty path.
 */
function path(name: string, d: string): ReactElement {
    if (!d) return null;
    return createElement('path', {
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
function dots(points: SparklinePoint[], showLast: boolean, showMinMax: boolean): ReactElement[] {
    if (points.length === 1) return [dot('last', points[0])];

    const lowest = minBy(points, 'value'),
        highest = maxBy(points, 'value'),
        hasRange = lowest && lowest.value !== highest.value;
    return [
        showMinMax && hasRange ? dot('min', lowest) : null,
        showMinMax && hasRange ? dot('max', highest) : null,
        showLast && points.length ? dot('last', last(points)) : null
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
