/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {capitalize, includes, isEmpty, isFinite} from 'lodash';
import {useLayoutEffect, useRef, useState} from 'react';
import type {KeyboardEvent, MouseEvent, ReactElement, ReactNode} from 'react';

import {div, li, ol} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import type {DomAttrsProps, HoistProps, LayoutProps, TestSupportProps} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {composeRefs, isBlankNode, splitLayoutProps, useOnResize} from '@xh/hoist/utils/react';

import './Steps.scss';

/**
 * Where a step stands in its sequence. A status says what happened to the step. It is not an
 * `Intent`, so a failed step is `error`, which the marker draws in the danger color.
 */
export type StepStatus = 'pending' | 'current' | 'complete' | 'warning' | 'error';

/** One step in a {@link Steps} sequence. */
export interface StepSpec {
    /** Name of the step. Blank content renders nothing, as for `description` and `detail`. */
    title: ReactNode;

    /** Longer text beneath the title, for example what the step does or what went wrong. */
    description?: ReactNode;

    /** Short secondary text set apart from the title, for example a timestamp or an owner. */
    detail?: ReactNode;

    /**
     * Status of the step. Takes priority over the status that {@link StepsProps.current} gives
     * it. A step with no status from either source is `pending`.
     */
    status?: StepStatus;

    /**
     * Icon for the step's marker. By default the marker shows the step's number, a check for a
     * `complete` step, and an icon for a `warning` or `error` step.
     */
    icon?: ReactElement;

    /**
     * True to make the step ignore `onStepClick`. A disabled step takes no focus and no click.
     * It shows dimmed, and reports itself as a disabled button to screen readers. Use it for a
     * step the user cannot go to yet. Has no effect with no `onStepClick`.
     */
    disabled?: boolean;

    /** True to leave the step out. The steps after it take the next numbers. */
    omit?: boolean;
}

export interface StepsProps extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /**
     * Steps to show, in order. A null entry, or one with `omit` set, is left out. Markers number
     * the steps that show, from 1.
     */
    steps: StepSpec[];

    /**
     * Index in `steps` of the current step, from 0, with left-out steps counted. Steps before it
     * are `complete` and steps after it are `pending`. An index past the last step completes
     * them all. A step's own `status` takes priority. Omit it to set each status on its step.
     */
    current?: number;

    /**
     * Direction of the sequence. Default `horizontal`.
     *
     * `horizontal` is a row for the top of a wizard or a detail panel. Each step takes an equal
     * share of the width, with its text centered under its marker. Text wraps and is never
     * truncated. When a share is narrower than `minStepWidth`, the row shows as `vertical`.
     *
     * `vertical` is a list with each step's text beside its marker. Use it for long descriptions,
     * a checklist or a simple timeline.
     */
    orientation?: 'horizontal' | 'vertical';

    /**
     * Narrowest share of the width, in pixels, that a step of a `horizontal` row may take. When
     * the steps that show would be narrower, the row shows as `vertical`, so that words are not
     * broken across lines. It goes back to a row when the width allows. Default 96, which keeps
     * a long word such as "confirmation" whole. Set 0 to keep the row at any width.
     */
    minStepWidth?: number;

    /**
     * Handler for a click or Enter/Space keypress on a step, called with the step and its index
     * in `steps`. Makes each step a focusable button, except a step with `disabled` set. A click
     * or keypress on a control inside a step, such as a button in its `detail`, does not call it.
     */
    onStepClick?: (step: StepSpec, index: number) => void;
}

/**
 * An ordered sequence of steps, each with a status: the lifecycle of an order, the stages of a
 * wizard, a workflow or a checklist. A line connects each step to the next.
 *
 * The component is presentation-only and holds no state. Set `current` to derive each status
 * from a position in the sequence, or set a `status` on each step.
 *
 * Renders an ordered list with no outer margin. It is a block, so it fills the width of a block
 * or a column. In a row such as an `hbox`, give it a `flex` or a `width`. Set the `--xh-steps-*`
 * CSS variables to change its colors and sizes. Renders nothing if given no steps to show.
 *
 * A null or omitted prop takes its default.
 */
export const [Steps, steps] = hoistCmp.withFactory<StepsProps>({
    displayName: 'Steps',
    model: false,
    className: 'xh-steps',

    render(props, ref) {
        const [
            layoutProps,
            {className, steps, current, orientation, minStepWidth, onStepClick, testId, domAttrs}
        ] = splitLayoutProps(props);

        // Each step keeps its index in `steps`, which `current` and `onStepClick` refer to.
        const shown = (steps ?? [])
                .map((step, index) => ({step, index}))
                .filter(({step}) => step && !step.omit),
            count = shown.length,
            minWidth = isFinite(minStepWidth) ? minStepWidth : MIN_STEP_WIDTH,
            [fits, setFits] = useState(true),
            listRef = useRef<HTMLOListElement>(null),
            argsRef = useRef({count, minWidth}),
            measure = () => setFits(stepsFit(listRef.current, argsRef.current)),
            resizeRef = useOnResize(measure);

        // The resize observer keeps the first `measure` it is given, so it reads from a ref.
        // The layout effect measures before the first paint, so the row shows in its final layout.
        argsRef.current = {count, minWidth};
        useLayoutEffect(measure, [count, minWidth]);

        if (isEmpty(shown)) return null;

        const isVertical = orientation === 'vertical',
            fellBack = !isVertical && !fits,
            olProps = mergeDeep(
                {
                    className: classNames(
                        className,
                        isVertical || fellBack ? 'xh-steps--vertical' : 'xh-steps--horizontal',
                        fellBack && 'xh-steps--fallback'
                    )
                },
                {style: layoutProps},
                {[TEST_ID]: testId, ...domAttrs}
            );

        // An explicit role keeps list semantics in browsers that drop them with `list-style: none`.
        return ol({
            ref: composeRefs(ref, listRef, resizeRef),
            role: 'list',
            ...olProps,
            items: shown.map(({step, index}, position) =>
                renderStep(step, index, position + 1, statusOf(step, index, current), onStepClick)
            )
        });
    }
});

//------------------
// Implementation
//------------------
// Default narrowest share for a step of a horizontal row, in pixels. Leaves 88px for text after
// the step's padding, which holds a long word such as "confirmation" or "instructions".
const MIN_STEP_WIDTH = 96;

const CONTROL_SELECTOR = 'button, a, input, select, textarea, [role="button"]';

const STATUSES: StepStatus[] = ['pending', 'current', 'complete', 'warning', 'error'];

/** Statuses that a marker shows by icon alone, so the marker names them for screen readers. */
const ICON_STATUSES: StepStatus[] = ['complete', 'warning', 'error'];

/**
 * True if each step gets at least `minWidth` of the list's width. The list is a block, so its width
 * does not depend on its layout, and a switch of layout cannot trigger another. A list with no
 * width has not been laid out, for example inside a hidden tab: it keeps the row until it has one.
 */
function stepsFit(list: HTMLElement, {count, minWidth}: {count: number; minWidth: number}) {
    if (!list || !count || !(minWidth > 0)) return true;

    const {paddingLeft, paddingRight} = window.getComputedStyle(list),
        width = list.clientWidth - px(paddingLeft) - px(paddingRight);

    return width <= 0 || width / count >= minWidth;
}

function px(v: string): number {
    return parseFloat(v) || 0;
}

function statusOf(step: StepSpec, index: number, current: number): StepStatus {
    if (includes(STATUSES, step.status)) return step.status;
    if (current == null) return 'pending';
    return index < current ? 'complete' : index === current ? 'current' : 'pending';
}

function renderStep(
    step: StepSpec,
    index: number,
    number: number,
    status: StepStatus,
    onStepClick: StepsProps['onStepClick']
) {
    const {title, description, detail, disabled} = step,
        isButton = !!onStepClick,
        isDisabled = isButton && !!disabled,
        hasTitle = !isBlankNode(title),
        hasDetail = !isBlankNode(detail),
        hasDescription = !isBlankNode(description),
        currentProps = status === 'current' ? {'aria-current': 'step' as const} : {},
        clickProps = isDisabled
            ? {role: 'button', 'aria-disabled': true}
            : isButton
              ? {
                    role: 'button',
                    tabIndex: 0,
                    onClick: (e: MouseEvent<HTMLDivElement>) => {
                        if (!isFromNestedControl(e)) onStepClick(step, index);
                    },
                    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                        if (isFromNestedControl(e)) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onStepClick(step, index);
                        }
                    }
                }
              : {};

    // The button reports the current step, so a screen reader says it on focus.
    return li({
        key: index,
        className: classNames(
            'xh-steps__step',
            `xh-steps__step--${status}`,
            isButton && !isDisabled && 'xh-steps__step--clickable',
            isDisabled && 'xh-steps__step--disabled'
        ),
        ...(isButton ? {} : currentProps),
        item: div({
            className: 'xh-steps__step-inner',
            ...clickProps,
            ...(isButton ? currentProps : {}),
            items: [
                marker(step, number, status),
                div({
                    omit: !hasTitle && !hasDetail && !hasDescription,
                    className: 'xh-steps__content',
                    items: [
                        div({
                            omit: !hasTitle && !hasDetail,
                            className: 'xh-steps__header',
                            items: [
                                div({omit: !hasTitle, className: 'xh-steps__title', item: title}),
                                div({
                                    omit: !hasDetail,
                                    className: 'xh-steps__detail',
                                    item: detail
                                })
                            ]
                        }),
                        div({
                            omit: !hasDescription,
                            className: 'xh-steps__description',
                            item: description
                        })
                    ]
                })
            ]
        })
    });
}

/**
 * True if an event came from a control inside the step, such as a button in its detail. That
 * control handles the event, so the step must not act on it too.
 */
function isFromNestedControl(e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>): boolean {
    const control = (e.target as Element).closest?.(CONTROL_SELECTOR);
    return control != null && control !== e.currentTarget;
}

function marker(step: StepSpec, number: number, status: StepStatus) {
    const ariaProps = includes(ICON_STATUSES, status)
        ? {role: 'img', 'aria-label': capitalize(status)}
        : {'aria-hidden': true};

    return div({
        className: 'xh-steps__marker',
        ...ariaProps,
        item: step.icon ?? defaultMarker(number, status)
    });
}

function defaultMarker(number: number, status: StepStatus): ReactNode {
    switch (status) {
        case 'complete':
            return Icon.check();
        case 'warning':
            return Icon.warning();
        case 'error':
            return Icon.x();
        default:
            return number;
    }
}
