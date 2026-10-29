/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {compact, isEmpty, isNumber, isString} from 'lodash';
import type {ReactNode} from 'react';

import {div, span} from '@xh/hoist/cmp/layout';
import {
    DomAttrsProps,
    hoistCmp,
    HoistProps,
    Intent,
    LayoutProps,
    TestSupportProps
} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import './StatCard.scss';

export interface StatCardProps extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /** Caption shown above the value. */
    title: ReactNode;

    /**
     * Primary content, pre-formatted by the caller. The card never formats - currency, percent
     * and precision decisions belong to the caller.
     */
    value: ReactNode;

    /**
     * Semantic color for the value, e.g. `success`/`danger` for a gain/loss. Omit for the
     * default text color - the card never derives an intent from the value itself.
     */
    valueIntent?: Intent;

    /** Smaller label rendered inline after the value, e.g. a unit or currency code. */
    secondary?: ReactNode;

    /**
     * Supporting detail shown as a tooltip on an info icon at the end of the value line. Omit to
     * render no icon.
     */
    infoTooltip?: string;

    /** Sub-line beneath the value. */
    detail?: ReactNode;

    /**
     * CSS color for an accent bar along the card's top border, e.g. `var(--xh-blue)`. A raw color
     * rather than an `Intent`, so callers can mark a category or series identity.
     */
    accent?: string;
}

/**
 * A tile that calls out a key figure: a caption over a prominent value, with an optional inline
 * secondary label, info tooltip and sub-line.
 *
 * The card is presentation-only. Callers pass an already-formatted `value` and, where wanted, an
 * explicit `valueIntent` - the card never formats or colors a value based on its content.
 *
 * Every line truncates with an ellipsis when space is short, and string/number content carries a
 * native tooltip with its full text. See {@link StatCardStrip} to lay out several in a row.
 */
export const [StatCard, statCard] = hoistCmp.withFactory<StatCardProps>({
    displayName: 'StatCard',
    model: false,
    className: 'xh-stat-card',

    render(props, ref) {
        const [
                layoutProps,
                {
                    className,
                    title,
                    value,
                    valueIntent,
                    secondary,
                    infoTooltip,
                    detail,
                    accent,
                    testId,
                    domAttrs
                }
            ] = splitLayoutProps(props),
            divProps = mergeDeep(
                {className: classNames(className, accent && 'xh-stat-card--accented')},
                {style: {...layoutProps, borderTopColor: accent}},
                {[TEST_ID]: testId, ...domAttrs}
            );

        return div({
            ref,
            ...divProps,
            items: [
                span({
                    className: 'xh-stat-card__title',
                    title: tooltipFor(title),
                    item: title
                }),
                div({
                    className: classNames(
                        'xh-stat-card__value',
                        valueIntent && `xh-stat-card__value--${valueIntent}`
                    ),
                    items: [
                        span({
                            className: 'xh-stat-card__value-primary',
                            title: tooltipFor(value),
                            item: value
                        }),
                        span({
                            omit: secondary == null,
                            className: 'xh-stat-card__secondary',
                            title: tooltipFor(secondary),
                            item: secondary
                        }),
                        span({
                            omit: !infoTooltip,
                            className: 'xh-stat-card__info',
                            title: infoTooltip,
                            item: Icon.info()
                        })
                    ]
                }),
                span({
                    omit: detail == null,
                    className: 'xh-stat-card__detail',
                    title: tooltipFor(detail),
                    item: detail
                })
            ]
        });
    }
});

export interface StatCardStripProps
    extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /**
     * Cards to render left-to-right, each given an equal share of the strip's width. Null
     * entries are skipped, so a caller can build this list from functions that may decline to
     * render a card. Renders nothing if empty.
     */
    cards?: StatCardProps[];
}

/**
 * A horizontal row of {@link StatCard}s, each given an equal share of the strip's width.
 */
export const [StatCardStrip, statCardStrip] = hoistCmp.withFactory<StatCardStripProps>({
    displayName: 'StatCardStrip',
    model: false,
    className: 'xh-stat-card-strip',

    render(props, ref) {
        const [layoutProps, {className, cards, testId, domAttrs}] = splitLayoutProps(props),
            validCards = compact(cards);

        if (isEmpty(validCards)) return null;

        return div({
            ref,
            ...mergeDeep({className}, {style: layoutProps}, {[TEST_ID]: testId, ...domAttrs}),
            items: validCards.map((card, idx) => statCard({...card, key: idx}))
        });
    }
});

//------------------
// Implementation
//------------------
/**
 * Full text for a line's native tooltip. Null for an element, whose text is unknowable here -
 * such content should carry its own tooltip.
 */
function tooltipFor(content: ReactNode): string {
    return isString(content) || isNumber(content) ? String(content) : null;
}
