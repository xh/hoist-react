/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {isBoolean, isEmpty} from 'lodash';
import {useLayoutEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';

import {div} from '@xh/hoist/cmp/layout';
import {elementFactory, hoistCmp} from '@xh/hoist/core';
import type {
    ComponentSize,
    DomAttrsProps,
    HoistProps,
    Intent,
    LayoutProps,
    TestSupportProps
} from '@xh/hoist/core';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {composeRefs, isBlankNode, splitLayoutProps, useOnResize} from '@xh/hoist/utils/react';

import './KeyValueList.scss';

/** A labeled value in a {@link KeyValueList}. */
export interface KeyValueEntry {
    /** Caption for the value. */
    label: ReactNode;

    /**
     * Content, pre-formatted by the caller. The list never formats a value. A null, undefined or
     * blank string value shows the list's `emptyText`. A boolean is data, not blank content: it
     * shows as the text `true` or `false`. Pass a string to show it another way.
     */
    value?: ReactNode;

    /** Colors the value with a semantic color, to flag a status. */
    intent?: Intent;

    /** True to leave the entry out. */
    omit?: boolean;
}

export interface KeyValueListProps
    extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /** Labeled values to show, in order. Null entries are skipped. */
    entries: KeyValueEntry[];

    /**
     * Where each label sits against its value. Default `left`, with the labels of a column
     * aligned and as wide as the widest of them. Use `top` to stack each label above its value.
     *
     * `Separator.labelPosition` takes other values (`start`, `center`, `end`), because it places
     * a label along a rule.
     */
    labelPosition?: 'left' | 'top';

    /**
     * Most columns to lay the entries out in, filled row by row. The list uses fewer in a
     * container too narrow to hold them at `minColumnWidth`, and never more than it has entries.
     * Omit to fit as many columns of at least `minColumnWidth` as the width of the list allows.
     */
    columns?: number;

    /**
     * Narrowest a column gets, in pixels. Default 300, or 180 when `labelPosition` is `top`. When
     * `columns` is set, the default is 180, or 120 when `labelPosition` is `top`.
     */
    minColumnWidth?: number;

    /** Shown in place of a null, undefined or blank string value. Default `-`. */
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
 *
 * Renders nothing if given no entries.
 */
export const [KeyValueList, keyValueList] = hoistCmp.withFactory<KeyValueListProps>({
    displayName: 'KeyValueList',
    model: false,
    className: 'xh-key-value-list',

    render(props, ref) {
        const [
                layoutProps,
                {
                    className,
                    entries,
                    labelPosition,
                    columns,
                    minColumnWidth,
                    emptyText,
                    size,
                    dividers,
                    testId,
                    domAttrs
                }
            ] = splitLayoutProps(props),
            labelOnTop = labelPosition === 'top',
            hasColumns = columns >= 1,
            minWidth =
                minColumnWidth > 0
                    ? minColumnWidth
                    : (hasColumns ? COLUMNS_MIN_WIDTH : FIT_MIN_WIDTH)[labelOnTop ? 'top' : 'left'],
            visibleEntries = (entries ?? []).filter(it => it && !it.omit),
            count = visibleEntries.length,
            [fitColumns, setFitColumns] = useState<number>(1),
            listRef = useRef<HTMLDListElement>(null),
            minWidthRef = useRef(minWidth),
            measure = () => setFitColumns(columnsThatFit(listRef.current, minWidthRef.current)),
            resizeRef = useOnResize(measure);

        // The resize observer keeps the first `measure` it is given, so it reads from a ref.
        minWidthRef.current = minWidth;
        useLayoutEffect(measure, [minWidth, count]);

        if (isEmpty(visibleEntries)) return null;

        const maxColumns = Math.min(hasColumns ? Math.floor(columns) : count, count),
            columnCount = Math.min(maxColumns, fitColumns),
            lastRowStart = count - (count % columnCount || columnCount);

        return dl({
            ref: composeRefs(ref, listRef, resizeRef),
            ...mergeDeep(
                {
                    className: classNames(
                        className,
                        labelOnTop && 'xh-key-value-list--label-top',
                        size === 'compact' && 'xh-key-value-list--compact',
                        dividers && 'xh-key-value-list--dividers'
                    )
                },
                {style: {...layoutProps, '--xh-key-value-list-columns': columnCount}},
                {[TEST_ID]: testId, ...domAttrs}
            ),
            items: visibleEntries.map(({label, value, intent}, idx) => {
                const empty = !isBoolean(value) && isBlankNode(value);
                return div({
                    key: idx,
                    className: classNames(
                        'xh-key-value-list__entry',
                        intent && `xh-key-value-list__entry--intent-${intent}`,
                        idx >= lastRowStart && 'xh-key-value-list__entry--last-row'
                    ),
                    items: [
                        dt({className: 'xh-key-value-list__label', item: label}),
                        dd({
                            className: classNames(
                                'xh-key-value-list__value',
                                empty && 'xh-key-value-list__value--empty'
                            ),
                            item: empty ? (emptyText ?? '-') : isBoolean(value) ? `${value}` : value
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
// Default narrowest column, in pixels. A given `columns` takes a lower floor, as the caller asked
// for that many: it gives up a column only when one would be too narrow to read.
const FIT_MIN_WIDTH = {left: 300, top: 180},
    COLUMNS_MIN_WIDTH = {left: 180, top: 120};

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
