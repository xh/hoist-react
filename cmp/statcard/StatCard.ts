/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {isEmpty, max, sumBy} from 'lodash';
import {Children, useId, useLayoutEffect, useRef, useState} from 'react';
import type {KeyboardEvent, MouseEvent, ReactNode} from 'react';

import {div, span} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import type {
    ComponentSize,
    DomAttrsProps,
    HoistProps,
    Intent,
    LayoutProps,
    TestSupportProps
} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {composeRefs, splitLayoutProps, useOnResize} from '@xh/hoist/utils/react';

import './StatCard.scss';

export interface StatCardProps extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /** Caption shown above the value. */
    title: ReactNode;

    /**
     * Primary content, pre-formatted by the caller. The card never formats - currency, percent,
     * precision and color decisions belong to the caller. A unit added with `fmtNumber`'s `label`
     * option renders smaller than the figure.
     *
     * The value and sub-value are never truncated in normal layout - a card does not get narrower
     * than them, and a {@link StatCardStrip} wraps cards to a new row instead. Compact large
     * values with `fmtMillions` or `fmtQuantity` (e.g. `48.5m`). Only a card held narrower than
     * its value - by an explicit `width` or `maxWidth` - shows an ellipsis.
     */
    value: ReactNode;

    /**
     * Smaller figure rendered inline after the value, e.g. a change vs. a prior period, a target
     * or an average. Pass a `fmtNumber` result to color it by sign - and invert its `colorSpec`
     * for a metric where down is good:
     *
     * ```ts
     * subValue: fmtPercent(delta, {withSignGlyph: true, colorSpec: {pos: 'xh-neg-val', neg: 'xh-pos-val'}})
     * ```
     */
    subValue?: ReactNode;

    /** Sub-line beneath the value, e.g. what a change is measured against. */
    detail?: ReactNode;

    /**
     * Supporting detail shown as a tooltip on an info icon after the title. Omit to render no icon.
     * Native browser tooltip - not available on touch devices.
     */
    infoTooltip?: string;

    /**
     * Flags the card with a semantic color on its border, as with {@link Card}. Does not color
     * the value - to do so, format the value with a `colorSpec` or wrap it in a styled element.
     */
    intent?: Intent;

    /**
     * CSS color for an accent bar, e.g. `var(--xh-blue)`, to mark a category or series identity.
     * Use `intent` to flag a status.
     *
     * The bar runs along the top edge by default. Set the `--stat-card-accent-top`, `-right`,
     * `-bottom` and `-left` CSS variables to choose its edge and thickness - e.g. a left bar with
     * `--stat-card-accent-top: 0; --stat-card-accent-left: 4px`.
     */
    accent?: string;

    /**
     * Size of the card - `large` for a headline figure, with a bigger value, captions and padding.
     * Default `standard`. Set the `--xh-stat-card-large-*` CSS variables to tune the large size.
     *
     * A large card stands best on its own or in a strip of large cards. In a wrapped strip, every
     * column takes the width of the widest card.
     */
    size?: Extract<ComponentSize, 'standard' | 'large'>;

    /**
     * Handler for a click or Enter/Space keypress on the card, e.g. to drill into the figure.
     * Makes the card focusable and styles it as clickable.
     */
    onClick?: (e: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * A tile that calls out a key figure: a caption over a prominent value, with an optional inline
 * sub-value, info tooltip and sub-line.
 *
 * The card is presentation-only. Callers pass an already-formatted `value` - the card never
 * formats or colors a value based on its content.
 *
 * A card on its own sizes to its content. For a row of cards, use {@link StatCardStrip} rather
 * than an `hbox` - a strip shares out the width, wraps cards before a value is cut short, and
 * truncates other lines with an ellipsis, showing their full text in a tooltip.
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
                    subValue,
                    detail,
                    infoTooltip,
                    intent,
                    accent,
                    size,
                    onClick,
                    testId,
                    domAttrs
                }
            ] = splitLayoutProps(props),
            titleId = useId(),
            clickProps = onClick
                ? {
                      role: 'button',
                      tabIndex: 0,
                      onClick,
                      onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onClick(e);
                          }
                      }
                  }
                : {role: 'group', 'aria-labelledby': titleId},
            divProps = mergeDeep(
                {
                    className: classNames(
                        className,
                        intent && `xh-stat-card--intent-${intent}`,
                        size === 'large' && 'xh-stat-card--large',
                        accent && 'xh-stat-card--accented',
                        onClick && 'xh-stat-card--clickable'
                    )
                },
                {style: {...layoutProps, '--xh-stat-card-accent-color': accent}},
                {[TEST_ID]: testId, ...domAttrs}
            );

        return div({
            ref,
            ...clickProps,
            ...divProps,
            items: [
                div({
                    className: 'xh-stat-card__header',
                    items: [
                        span({
                            id: titleId,
                            className: 'xh-stat-card__title',
                            onMouseEnter: titleIfTruncated,
                            item: title
                        }),
                        span({
                            omit: !infoTooltip,
                            className: 'xh-stat-card__info',
                            title: infoTooltip,
                            item: Icon.info()
                        })
                    ]
                }),
                div({
                    className: 'xh-stat-card__value',
                    items: [
                        span({
                            className: 'xh-stat-card__value-primary',
                            onMouseEnter: titleIfTruncated,
                            item: value
                        }),
                        span({
                            omit: subValue == null,
                            className: 'xh-stat-card__sub-value',
                            onMouseEnter: titleIfTruncated,
                            item: subValue
                        })
                    ]
                }),
                span({
                    omit: detail == null,
                    className: 'xh-stat-card__detail',
                    onMouseEnter: titleIfTruncated,
                    item: detail
                })
            ]
        });
    }
});

export interface StatCardStripProps
    extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {}

/**
 * A row of {@link StatCard}s, passed as `items`, each given an equal share of the strip's width.
 * Pass `flex` or `width` to a card to weight or fix its share.
 *
 * When the cards no longer fit on one row, the strip becomes an even grid with as many columns as
 * fit its widest card, so cards on later rows line up under those above. A card is never narrower
 * than its value and sub-value, or than the `--xh-stat-card-min-content-width` CSS variable. A
 * card's `flex` does not apply in the grid.
 *
 * Renders nothing if given no cards - use `omit` on a card to leave it out.
 */
export const [StatCardStrip, statCardStrip] = hoistCmp.withFactory<StatCardStripProps>({
    displayName: 'StatCardStrip',
    model: false,
    className: 'xh-stat-card-strip',

    render(props, ref) {
        const [layoutProps, {className, children, testId, domAttrs}] = splitLayoutProps(props),
            [columns, setColumns] = useState<number>(null),
            stripRef = useRef<HTMLDivElement>(null),
            resizeRef = useOnResize(() => setColumns(gridColumns(stripRef.current)));

        // Card values change with the cards passed in, so measure on each change as well as on resize.
        useLayoutEffect(() => setColumns(gridColumns(stripRef.current)), [children]);

        if (isEmpty(Children.toArray(children))) return null;

        return div({
            ref: composeRefs(ref, stripRef, resizeRef),
            role: 'group',
            ...mergeDeep(
                {className: classNames(className, columns && 'xh-stat-card-strip--grid')},
                {style: {...layoutProps, '--xh-stat-card-strip-columns': columns}},
                {[TEST_ID]: testId, ...domAttrs}
            ),
            items: children
        });
    }
});

//------------------
// Implementation
//------------------
/**
 * Columns for an even grid of a strip's cards, each as wide as the widest card's minimum. Null
 * while every card fits on one row at an equal share.
 */
function gridColumns(strip: HTMLElement): number {
    const cards = strip ? (Array.from(strip.children) as HTMLElement[]) : [];
    if (isEmpty(cards)) return null;

    const {columnGap, paddingLeft, paddingRight} = window.getComputedStyle(strip),
        gap = px(columnGap),
        width = strip.clientWidth - px(paddingLeft) - px(paddingRight),
        cardWidth = max(cards.map(minCardWidth)),
        fit = Math.floor((width + gap) / (cardWidth + gap));

    return fit >= cards.length ? null : Math.max(fit, 1);
}

/**
 * The narrowest a card can get: the wider of its value line and its header floor, plus padding and
 * border. Reads layout without changing it, so measuring adds no layout pass of its own. Returns 0
 * for an element that is not a StatCard.
 */
function minCardWidth(card: HTMLElement): number {
    const header = card.querySelector<HTMLElement>(':scope > .xh-stat-card__header'),
        valueLine = card.querySelector<HTMLElement>(':scope > .xh-stat-card__value');
    if (!header || !valueLine) return 0;

    // scrollWidth gives each part's full width even while truncated, rounded to a whole pixel.
    const parts = Array.from(valueLine.children) as HTMLElement[],
        valueWidth =
            sumBy(parts, it => it.scrollWidth + 1) +
            (parts.length - 1) * px(window.getComputedStyle(valueLine).columnGap),
        {paddingLeft, paddingRight, borderLeftWidth, borderRightWidth} =
            window.getComputedStyle(card);

    return (
        Math.max(valueWidth, px(window.getComputedStyle(header).minWidth)) +
        px(paddingLeft) +
        px(paddingRight) +
        px(borderLeftWidth) +
        px(borderRightWidth)
    );
}

function px(v: string): number {
    return parseFloat(v) || 0;
}

/**
 * Show a line's full text as a native tooltip, but only while it is truncated. Read from the DOM
 * on hover, so it covers element content (e.g. `fmtNumber` output) as well as strings.
 */
function titleIfTruncated(e: MouseEvent<HTMLElement>) {
    const el = e.currentTarget;
    if (el.scrollWidth > el.clientWidth) {
        el.title = el.textContent;
    } else {
        el.removeAttribute('title');
    }
}
