/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {capitalize, compact, includes, isEmpty} from 'lodash';
import type {KeyboardEvent, ReactElement, ReactNode} from 'react';

import {div, li, ol} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import type {DomAttrsProps, HoistProps, LayoutProps, TestSupportProps} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import './Steps.scss';

/** Where a step stands in its sequence. */
export type StepStatus = 'pending' | 'current' | 'complete' | 'warning' | 'error';

/** One step in a {@link Steps} sequence. */
export interface StepSpec {
    /** Name of the step. */
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
}

export interface StepsProps extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /** Steps to show, in order. */
    steps: StepSpec[];

    /**
     * Index of the current step, from 0. Steps before it are `complete` and steps after it are
     * `pending`. An index past the last step completes them all. A step's own `status` takes
     * priority. Omit it to set each status on its step.
     */
    current?: number;

    /**
     * Direction of the sequence. Default `horizontal`.
     *
     * `horizontal` is a row for the top of a wizard or a detail panel. Each step takes an equal
     * share of the width, with its text centered under its marker. Text wraps and is never
     * truncated, so the row gets taller in a narrow container and does not overflow it.
     *
     * `vertical` is a list with each step's text beside its marker. Use it for long descriptions,
     * a checklist or a simple timeline.
     */
    orientation?: 'horizontal' | 'vertical';

    /**
     * Handler for a click or Enter/Space keypress on a step, called with the step and its index.
     * Makes every step a focusable button. The handler decides which steps respond.
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
 * Renders an ordered list with no outer margin, at the full width of its container. Set the
 * `--xh-steps-*` CSS variables to change its colors and sizes. Renders nothing if given no steps.
 */
export const [Steps, steps] = hoistCmp.withFactory<StepsProps>({
    displayName: 'Steps',
    model: false,
    className: 'xh-steps',

    render(props, ref) {
        const [
            layoutProps,
            {className, steps, current, orientation, onStepClick, testId, domAttrs}
        ] = splitLayoutProps(props);

        if (isEmpty(compact(steps))) return null;

        const olProps = mergeDeep(
            {
                className: classNames(
                    className,
                    `xh-steps--${orientation === 'vertical' ? 'vertical' : 'horizontal'}`,
                    onStepClick && 'xh-steps--clickable'
                )
            },
            {style: layoutProps},
            {[TEST_ID]: testId, ...domAttrs}
        );

        // An explicit role keeps list semantics in browsers that drop them with `list-style: none`.
        return ol({
            ref,
            role: 'list',
            ...olProps,
            items: steps.map((step, index) =>
                step ? renderStep(step, index, statusOf(step, index, current), onStepClick) : null
            )
        });
    }
});

//------------------
// Implementation
//------------------
const STATUSES: StepStatus[] = ['pending', 'current', 'complete', 'warning', 'error'];

/** Statuses that a marker shows by icon alone, so the marker names them for screen readers. */
const ICON_STATUSES: StepStatus[] = ['complete', 'warning', 'error'];

function statusOf(step: StepSpec, index: number, current: number): StepStatus {
    if (includes(STATUSES, step.status)) return step.status;
    if (current == null) return 'pending';
    return index < current ? 'complete' : index === current ? 'current' : 'pending';
}

function renderStep(
    step: StepSpec,
    index: number,
    status: StepStatus,
    onStepClick: StepsProps['onStepClick']
) {
    const {title, description, detail} = step,
        currentProps = status === 'current' ? {'aria-current': 'step' as const} : {},
        clickProps = onStepClick
            ? {
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => onStepClick(step, index),
                  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onStepClick(step, index);
                      }
                  }
              }
            : {};

    // The focusable element reports the current step, so a screen reader says it on focus.
    return li({
        key: index,
        className: `xh-steps__step xh-steps__step--${status}`,
        ...(onStepClick ? {} : currentProps),
        item: div({
            className: 'xh-steps__step-inner',
            ...clickProps,
            ...(onStepClick ? currentProps : {}),
            items: [
                marker(step, index, status),
                div({
                    className: 'xh-steps__content',
                    items: [
                        div({
                            className: 'xh-steps__header',
                            items: [
                                div({className: 'xh-steps__title', item: title}),
                                div({
                                    omit: detail == null,
                                    className: 'xh-steps__detail',
                                    item: detail
                                })
                            ]
                        }),
                        div({
                            omit: description == null,
                            className: 'xh-steps__description',
                            item: description
                        })
                    ]
                })
            ]
        })
    });
}

function marker(step: StepSpec, index: number, status: StepStatus) {
    const ariaProps = includes(ICON_STATUSES, status)
        ? {role: 'img', 'aria-label': capitalize(status)}
        : {'aria-hidden': true};

    return div({
        className: 'xh-steps__marker',
        ...ariaProps,
        item: step.icon ?? defaultMarker(index, status)
    });
}

function defaultMarker(index: number, status: StepStatus): ReactNode {
    switch (status) {
        case 'complete':
            return Icon.check();
        case 'warning':
            return Icon.warning();
        case 'error':
            return Icon.x();
        default:
            return index + 1;
    }
}
