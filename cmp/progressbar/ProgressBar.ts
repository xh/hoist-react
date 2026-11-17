/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {clamp, isFinite, isFunction, isNumber, isString} from 'lodash';
import {useId} from 'react';
import type {CSSProperties, ReactNode} from 'react';

import {div, span} from '@xh/hoist/cmp/layout';
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

import './ProgressBar.scss';

export interface ProgressBarProps extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /**
     * Value to show, from `min` to `max`. A value outside that range draws an empty or a full bar.
     * A null value draws an empty bar with no figure. Ignored when `indeterminate` is true.
     */
    value?: number;

    /** Value of an empty bar. Default 0. */
    min?: number;

    /** Value of a full bar. Default 100. */
    max?: number;

    /**
     * True to draw an animated fill for work of unknown length, in place of a value. The
     * animation stops for users who ask their system for reduced motion. Default false.
     */
    indeterminate?: boolean;

    /**
     * Caption shown above the bar, naming what it measures. Also the bar's accessible name. A
     * long label wraps. A blank label renders nothing.
     */
    label?: ReactNode;

    /**
     * Renders the figure shown above the bar, opposite the label. Passed the value as given,
     * before it is clamped to the range, and called only for a value the bar can place. Pass a
     * formatter such as `numberRenderer()`, or a function that returns text such as
     * `72 of 100 GB`. A blank result shows no figure.
     *
     * True or null shows the default: the value as a whole percent of the range. Only a full bar
     * reads `100%` and only an empty one reads `0%`. False hides the figure and draws the bar only.
     * An indeterminate bar shows no figure.
     *
     * A string or number figure is also the bar's `aria-valuetext`, shown or not.
     */
    valueRenderer?: boolean | ((value: number) => ReactNode);

    /**
     * Semantic color for the fill, for example `danger` for a limit that is close. The fill takes
     * the primary color by default. Set the `--xh-progress-bar-fill-bg` CSS variable to change that
     * default.
     */
    intent?: Intent;

    /**
     * Value to mark on the track with a thin line, for a threshold or a goal. Takes the same
     * scale as `value`. No marker shows for a target outside `min` to `max`, or on an
     * indeterminate bar.
     */
    target?: number;
}

/**
 * A horizontal bar that shows a value against a maximum: the progress of a task, or usage against
 * a limit. Set `indeterminate` for work of unknown length.
 *
 * The bar is presentation-only. It is a block with no outer margin, so it fills the width of a
 * block or a column. In a row such as an `hbox`, give it a `flex` or a `width`. Set the
 * `--xh-progress-bar-*` CSS variables to change its height, radius and colors.
 *
 * A null or omitted prop takes its default. A bar with no value it can place draws empty with no
 * default figure: a null or NaN value, or a `max` that is not above `min`.
 *
 * The root element takes `role="progressbar"`, named by its `label`. Pass an `aria-label` through
 * `domAttrs` for a bar with no label.
 */
export const [ProgressBar, progressBar] = hoistCmp.withFactory<ProgressBarProps>({
    displayName: 'ProgressBar',
    model: false,
    className: 'xh-progress-bar',

    render(props, ref) {
        const [
                layoutProps,
                {className, value, label, valueRenderer, intent, target, testId, domAttrs}
            ] = splitLayoutProps(props),
            min = props.min ?? 0,
            max = props.max ?? 100,
            indeterminate = props.indeterminate ?? false,
            labelId = useId(),
            fraction = indeterminate ? null : fractionOf(value, min, max),
            targetFraction =
                indeterminate || target == null || target < min || target > max
                    ? null
                    : fractionOf(target, min, max),
            figure = figureOf(value, fraction, valueRenderer),
            shownFigure = valueRenderer !== false && !isBlankNode(figure) ? figure : null,
            hasLabel = !isBlankNode(label),
            ariaProps = {
                role: 'progressbar',
                'aria-labelledby': hasLabel ? labelId : null,
                'aria-valuemin': fraction != null ? min : null,
                'aria-valuemax': fraction != null ? max : null,
                'aria-valuenow': fraction != null ? clamp(value, min, max) : null,
                'aria-valuetext': isString(figure) || isNumber(figure) ? `${figure}` : null
            },
            divProps = mergeDeep(
                {
                    className: classNames(
                        className,
                        intent && `xh-progress-bar--intent-${intent}`,
                        indeterminate && 'xh-progress-bar--indeterminate'
                    )
                },
                {style: layoutProps},
                {[TEST_ID]: testId, ...domAttrs}
            );

        return div({
            ref,
            ...ariaProps,
            ...divProps,
            items: [
                div({
                    omit: !hasLabel && shownFigure == null,
                    className: 'xh-progress-bar__header',
                    items: [
                        span({
                            omit: !hasLabel,
                            id: labelId,
                            className: 'xh-progress-bar__label',
                            item: label
                        }),
                        span({
                            omit: shownFigure == null,
                            className: 'xh-progress-bar__value',
                            item: shownFigure
                        })
                    ]
                }),
                div({
                    className: 'xh-progress-bar__track',
                    items: [
                        div({
                            className: 'xh-progress-bar__fill',
                            style: indeterminate ? null : {width: `${(fraction ?? 0) * 100}%`}
                        }),
                        div({
                            omit: targetFraction == null,
                            className: 'xh-progress-bar__target',
                            style: {
                                '--xh-progress-bar-target-fraction': targetFraction
                            } as CSSProperties
                        })
                    ]
                })
            ]
        });
    }
});

//------------------
// Implementation
//------------------
/**
 * Where a value sits in its range, from 0 to 1, clamped to the range. Null when there is no place
 * to put it: a null or NaN value, or a `max` that is not above `min`.
 */
function fractionOf(value: number, min: number, max: number): number {
    if (value == null || !(max > min)) return null;
    const ret = (clamp(value, min, max) - min) / (max - min);
    return isFinite(ret) ? ret : null;
}

/** A whole percent that reads 0 or 100 only for an empty or a full bar. */
function figureOf(
    value: number,
    fraction: number,
    valueRenderer: ProgressBarProps['valueRenderer']
): ReactNode {
    if (fraction == null) return null;
    return isFunction(valueRenderer) ? valueRenderer(value) : percentOf(fraction);
}

function percentOf(fraction: number): string {
    const percent =
        fraction <= 0 ? 0 : fraction >= 1 ? 100 : clamp(Math.round(fraction * 100), 1, 99);
    return `${percent}%`;
}
