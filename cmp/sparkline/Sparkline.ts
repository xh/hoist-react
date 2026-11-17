/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {first, includes, isFinite, isFunction, last, maxBy, minBy, partition} from 'lodash';
import type {HTMLAttributes, ReactElement, Ref} from 'react';

import {div, path, span, svg} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {sparklineTooltipImpl} from '@xh/hoist/dynamics/desktop';
import type {
    DomAttrsProps,
    HoistProps,
    Intent,
    LayoutProps,
    TestSupportProps
} from '@xh/hoist/core';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {composeRefs, splitLayoutProps} from '@xh/hoist/utils/react';

import {
    scaleY,
    sparklineAreaPath,
    sparklineBars,
    sparklineBarsPath,
    sparklineDomain,
    sparklineLabel,
    sparklineLinePath,
    sparklinePoints,
    sparklineSegments,
    VIEW_SIZE
} from './impl/SparklineGeometry';
import type {SparklinePoint, SparklineSegment} from './impl/SparklineGeometry';
import './Sparkline.scss';

export type SparklineType = 'line' | 'area' | 'bar';

/**
 * Where a Sparkline takes its color from:
 * - `intent` - the `intent` prop, or the neutral color if unset.
 * - `trend` - the direction of the whole series, from its first value to its last.
 * - `sign` - the side of zero, or of `baseline` if set, of each part of the series.
 */
export type SparklineColorBy = 'intent' | 'trend' | 'sign';

/** A value to mark with a dot: the first, the last, the lowest or the highest. */
export type SparklineMarker = 'first' | 'last' | 'min' | 'max';

/**
 * Function to build a Sparkline's tooltip. On desktop, called only once the sparkline is hovered.
 * @param data - the series, as passed to the component.
 * @returns the content to show on hover, or null for no tooltip.
 */
export type SparklineTooltipFn = (data: number[]) => ReactElement | string;

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
     * - `area` - a line, filled to `baseline` if set, to zero with `colorBy: 'sign'`, or else down
     *   to the bottom of the box.
     * - `bar` - a bar per value. A bar grows up or down from zero, or from `baseline` if set.
     */
    type?: SparklineType;

    /**
     * Where the series takes its color from. Default `intent`. The `trend` and `sign` options use
     * the positive and negative value colors, those of the `xh-pos-val` and `xh-neg-val` classes.
     *
     * - `intent` - the `intent` prop, or the neutral color if unset.
     * - `trend` - the whole series in the positive color if its last value is above its first, or
     *   the negative color if below. A series that ends where it started stays neutral.
     * - `sign` - each bar, or each part of a line or area, by its side of zero or `baseline`. The
     *   scale takes zero in, and an area fills to it. Suits a series of profit and loss.
     */
    colorBy?: SparklineColorBy;

    /**
     * Semantic color for the series, used when `colorBy` is `intent`. Default is the neutral
     * `--xh-sparkline-color`. For any other color, set that CSS variable or the CSS `color` of the
     * component.
     */
    intent?: Intent;

    /**
     * Values to mark with a dot. The `min` and `max` dots use the negative and positive value
     * colors, and show only when the series is not flat. Applies to the `line` and `area` types.
     * A lone value always shows as a dot.
     */
    markers?: SparklineMarker[];

    /**
     * Value to draw a reference line at, such as zero or a prior close. The scale extends to
     * take it in, unless `min` or `max` fixes that side. An area fills to it, and bars grow from it.
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
     * Tooltip for the whole sparkline, or a function to build it from the data. Default none.
     *
     * Desktop only - on mobile no tooltip shows. It mounts on the first hover, not with each
     * sparkline, so it is cheap to set on a grid column.
     */
    tooltip?: ReactElement | string | SparklineTooltipFn;
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
                    colorBy,
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
            // Bars, and a series colored by sign, are drawn from the origin.
            bySign = colorBy === 'sign',
            fromOrigin = isBar || bySign,
            domain = sparklineDomain(data, {
                min,
                max,
                include: fromOrigin ? [origin] : [baseline]
            }),
            points = sparklinePoints(data, domain),
            floorY = fromOrigin || isFinite(baseline) ? scaleY(origin, domain) : VIEW_SIZE,
            divProps = mergeDeep(
                {
                    className: classNames(
                        className,
                        `xh-sparkline--${shape}`,
                        colorClass(colorBy, intent, points)
                    )
                },
                {style: layoutProps},
                {[TEST_ID]: testId, ...domAttrs}
            ),
            plot = div({
                className: 'xh-sparkline__plot',
                children: [
                    svg({
                        className: 'xh-sparkline__svg',
                        viewBox: `0 0 ${VIEW_SIZE} ${VIEW_SIZE}`,
                        preserveAspectRatio: 'none',
                        focusable: false,
                        'aria-hidden': true,
                        children: [
                            ...(isBar
                                ? barShapes(data, domain, origin, bySign)
                                : lineShapes(
                                      points,
                                      shape === 'area',
                                      floorY,
                                      bySign && sparklineSegments(points, domain, origin)
                                  )),
                            baselineShape(baseline, domain)
                        ]
                    }),
                    ...(isBar ? [] : dots(points, markers))
                ]
            }),
            renderRoot = ({ref: targetRef, className, ...rootProps}: RootProps = {}) =>
                div({
                    ref: targetRef ? composeRefs(ref, targetRef) : ref,
                    role: 'img',
                    ...divProps,
                    ...rootProps,
                    className: classNames(divProps.className, className),
                    'aria-label': String(domAttrs?.['aria-label'] ?? sparklineLabel(data)),
                    children: plot
                });

        // The desktop AppContainer installs the impl. Without it, as on mobile, show no tooltip.
        if (tooltip == null || tooltip === '' || !sparklineTooltipImpl) return renderRoot();

        return sparklineTooltipImpl({
            getContent: () => (isFunction(tooltip) ? tooltip(data) : tooltip),
            renderTarget: renderRoot
        });
    }
});

//------------------
// Implementation
//------------------
/** Props a desktop tooltip adds to the root element. */
type RootProps = HTMLAttributes<HTMLElement> & {ref?: Ref<HTMLElement>};

/**
 * The line, and the area under it down to `floorY` if `withArea`. With `segments`, the parts below
 * the origin draw as separate shapes, in the negative color.
 */
function lineShapes(
    points: SparklinePoint[],
    withArea: boolean,
    floorY: number,
    segments: SparklineSegment[]
): ReactElement[] {
    // A lone value has no line to draw, and shows as a dot instead.
    if (points.length < 2) return [];

    const [negative, positive] = segments
            ? partition(segments, 'negative')
            : [[], [{points, negative: false}]],
        areaPath = (segs: SparklineSegment[]) =>
            segs.map(it => sparklineAreaPath(it.points, floorY)).join(''),
        linePath = (segs: SparklineSegment[]) =>
            segs.map(it => sparklineLinePath(it.points)).join('');
    return [
        withArea ? shapePath('area', areaPath(positive)) : null,
        withArea ? shapePath('area xh-sparkline__area--negative', areaPath(negative)) : null,
        shapePath('line', linePath(positive)),
        shapePath('line xh-sparkline__line--negative', linePath(negative))
    ];
}

function barShapes(
    data: number[],
    domain: [number, number],
    origin: number,
    bySign: boolean
): ReactElement[] {
    const bars = sparklineBars(data, domain, origin),
        [negative, positive] = partition(bars, bar => bySign && bar.negative);
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

/** The class that sets the series color. With `sign`, it colors the shapes above the origin. */
function colorClass(colorBy: SparklineColorBy, intent: Intent, points: SparklinePoint[]): string {
    switch (colorBy) {
        case 'sign':
            return 'xh-sparkline--positive';
        case 'trend': {
            const change = points.length > 1 ? last(points).value - first(points).value : 0;
            if (change === 0) return null;
            return change > 0 ? 'xh-sparkline--positive' : 'xh-sparkline--negative';
        }
        default:
            return intent ? `xh-sparkline--intent-${intent}` : null;
    }
}
