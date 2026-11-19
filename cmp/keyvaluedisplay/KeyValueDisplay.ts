/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {isEmpty} from 'lodash';
import {useLayoutEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';

import {div} from '@xh/hoist/cmp/layout';
import {elementFactory, hoistCmp} from '@xh/hoist/core';
import type {
    ComponentSize,
    DomAttrsProps,
    HoistProps,
    HSide,
    Intent,
    LayoutProps,
    PlainObject,
    TestSupportProps
} from '@xh/hoist/core';
import {throwIfRowsPassedAsChildren} from '@xh/hoist/utils/impl';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {isBlankNode, splitLayoutProps, useComposedRefs, useOnResize} from '@xh/hoist/utils/react';

import './KeyValueDisplay.scss';

/** A labeled value in a {@link KeyValueDisplay}. */
export interface KeyValueEntry {
    /** Caption for the value. */
    label: ReactNode;

    /**
     * Content, pre-formatted by the caller. The list never formats a value. A null or undefined
     * value shows the list's `nullDisplay`. Any other value renders as React renders it, so a
     * boolean shows nothing - pass a string such as `Yes` or `No` instead.
     */
    value?: ReactNode;

    /** Colors the value with a semantic color, to flag a status. */
    intent?: Intent;

    /** True to leave the entry out. */
    omit?: boolean;
}

export interface KeyValueDisplayProps
    extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /** Labeled values to show, in order. Null entries are skipped. */
    entries: KeyValueEntry[];

    /**
     * Where each label sits against its value. Default `left`, with the labels of a column
     * aligned and as wide as the widest of them. Use `top` to stack each label above its value.
     */
    labelSide?: 'left' | 'top';

    /**
     * Side of its column each label aligns to, when `labelSide` is `left`. Default `left`. Use
     * `right` to set each label against its value. No effect when `labelSide` is `top`.
     */
    labelAlign?: HSide;

    /**
     * Side of its column each value aligns to, when `labelSide` is `left`. Default `left`, with
     * each value beside its label. Use `right` to set the values at the far side of the column,
     * across from their labels, as in a summary or statement. Digits then take equal widths, so
     * the figures in a column line up. No effect when `labelSide` is `top`.
     */
    valueAlign?: HSide;

    /**
     * Most columns to lay the entries out in, filled row by row. The list uses fewer in a
     * container too narrow to hold them at `minColumnWidth`, and never more than it has entries.
     * Omit to fit as many columns of at least `minColumnWidth` as the width of the list allows.
     */
    columns?: number;

    /**
     * Narrowest a column gets, in pixels, with or without `columns`. Default 240, or 160 when
     * `labelSide` is `top`. A column with its labels on the left holds a label and a value side by
     * side, so it needs more width than one that stacks them.
     */
    minColumnWidth?: number;

    /** Shown in place of a null or undefined value. Default `-`. */
    nullDisplay?: ReactNode;

    /**
     * Shown in place of the list when it has no entries to show. Default is to render nothing,
     * as does a blank `emptyText`.
     */
    emptyText?: ReactNode;

    /** Size of the list - `compact` for smaller text and tighter rows. Default `standard`. */
    size?: Extract<ComponentSize, 'compact' | 'standard'>;

    /** True to draw a rule between rows. Default false. */
    dividers?: boolean;
}

/**
 * A display-only list of labeled values, such as the fields of a record in a detail panel. Renders
 * as an HTML description list.
 *
 * The list is presentation-only. Callers pass each `value` already formatted.
 *
 * The list fills the width of its container and has no outer margin. Long labels and values wrap,
 * breaking within a word if needed, so the list never forces horizontal overflow. To truncate a
 * value instead, pass an element that does so.
 */
export const [KeyValueDisplay, keyValueDisplay] = hoistCmp.withFactory<KeyValueDisplayProps>({
    displayName: 'KeyValueDisplay',
    model: false,
    className: 'xh-key-value-display',

    render(props, ref) {
        throwIfRowsPassedAsChildren(props.children, 'entries', 'KeyValueDisplay');
        const [
                layoutProps,
                {
                    className,
                    entries,
                    labelSide,
                    labelAlign,
                    valueAlign,
                    columns,
                    minColumnWidth,
                    nullDisplay,
                    emptyText,
                    size,
                    dividers,
                    testId,
                    domAttrs
                }
            ] = splitLayoutProps(props),
            labelOnTop = labelSide === 'top',
            minWidth = minColumnWidth ?? (labelOnTop ? 160 : 240),
            visibleEntries = (entries ?? []).filter(it => it && !it.omit),
            count = visibleEntries.length,
            [fitColumns, setFitColumns] = useState<number>(1),
            listRef = useRef<HTMLDListElement>(null),
            minWidthRef = useRef(minWidth),
            measure = () => setFitColumns(columnsThatFit(listRef.current, minWidthRef.current)),
            resizeRef = useOnResize(measure),
            composedRef = useComposedRefs(ref, listRef, resizeRef),
            rootProps = (classes: string[], style?: PlainObject) =>
                mergeDeep(
                    {className: classNames(className, classes)},
                    {style: {...layoutProps, ...style}},
                    {[TEST_ID]: testId, ...domAttrs}
                );

        // The resize observer keeps the first `measure` it is given, so it reads from a ref.
        minWidthRef.current = minWidth;
        useLayoutEffect(measure, [minWidth, count]);

        if (isEmpty(visibleEntries)) {
            return isBlankNode(emptyText)
                ? null
                : div({ref, ...rootProps(['xh-key-value-display--empty']), children: emptyText});
        }

        const maxColumns = Math.min(columns ?? count, count),
            columnCount = Math.max(Math.min(maxColumns, fitColumns), 1),
            lastRowStart = count - (count % columnCount || columnCount);

        return dl({
            ref: composedRef,
            ...rootProps(
                [
                    labelOnTop && 'xh-key-value-display--label-top',
                    !labelOnTop &&
                        labelAlign === 'right' &&
                        'xh-key-value-display--label-align-right',
                    !labelOnTop &&
                        valueAlign === 'right' &&
                        'xh-key-value-display--value-align-right',
                    size === 'compact' && 'xh-key-value-display--compact',
                    dividers && 'xh-key-value-display--dividers'
                ],
                {'--xh-key-value-display-columns': columnCount}
            ),
            children: visibleEntries.map(({label, value, intent}, idx) => {
                const isNull = value == null;
                return div({
                    key: idx,
                    className: classNames(
                        'xh-key-value-display__entry',
                        intent && `xh-key-value-display__entry--intent-${intent}`,
                        idx >= lastRowStart && 'xh-key-value-display__entry--last-row'
                    ),
                    children: [
                        dt({className: 'xh-key-value-display__label', children: label}),
                        dd({
                            className: classNames(
                                'xh-key-value-display__value',
                                isNull && 'xh-key-value-display__value--null'
                            ),
                            children: isNull ? (nullDisplay ?? '-') : value
                        })
                    ]
                });
            })
        });
    }
});

//------------------
// Implementation
//------------------
const dl = elementFactory('dl'),
    dt = elementFactory('dt'),
    dd = elementFactory('dd');

/** Columns of at least `minWidth` that fit across a list, allowing for the gap between them. */
function columnsThatFit(list: HTMLElement, minWidth: number): number {
    if (!list) return 1;

    const {columnGap, paddingLeft, paddingRight} = window.getComputedStyle(list),
        gap = px(columnGap),
        width = list.clientWidth - px(paddingLeft) - px(paddingRight);

    return Math.max(Math.floor((width + gap) / (minWidth + gap)), 1);
}

function px(v: string): number {
    return parseFloat(v) || 0;
}
