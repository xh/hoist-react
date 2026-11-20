/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {isEmpty} from 'lodash';
import {useId} from 'react';
import type {ReactElement, ReactNode} from 'react';

import {div, li, ol, span, ul} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import type {
    ComponentSize,
    DomAttrsProps,
    HoistProps,
    Intent,
    LayoutProps,
    TestSupportProps
} from '@xh/hoist/core';
import {clickableRowProps, throwIfRowsPassedAsChildren} from '@xh/hoist/utils/impl';
import type {RowClickHandler} from '@xh/hoist/utils/impl';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {isBlankNode, splitLayoutProps} from '@xh/hoist/utils/react';

import './ListDisplay.scss';

/**
 * One entry in an {@link ListDisplay}.
 *
 * A `title`, `description` or `detail` that is null, a boolean or a blank string renders
 * nothing and leaves no gap.
 */
export interface ListDisplayEntry {
    /** Main text of the entry. Wraps when it does not fit on one line. */
    title: ReactNode;

    /** Longer text beneath the title, for example what an alert is about. Wraps. */
    description?: ReactNode;

    /**
     * Short content set apart at the far end of the title's line, for example a figure, a
     * `Badge` or a timestamp. A long title wraps beside it. In a very narrow list it drops to a
     * line of its own.
     */
    detail?: ReactNode;

    /** Icon shown before the text. Not shown in a `numbered` list, which shows numbers. */
    icon?: ReactElement;

    /**
     * Flags the entry with a semantic color on its icon or number. An entry with no icon, in a
     * list where another entry has one, shows a small dot in that color in the icon's place. In
     * a list where no entry has an icon or number, it draws a thin colored bar before the text
     * instead. Does not color the text, so say what the color means in the text as well.
     */
    intent?: Intent;

    /**
     * Handler for a click or Enter/Space keypress on the entry, e.g. to open the record it
     * shows. Makes the entry clickable, with a hover style.
     *
     * A click anywhere in the entry calls it. The title is the button that takes keyboard focus
     * and that screen readers announce, so a control in the `detail`, such as a button, is not
     * nested inside it. A click or keypress on such a control goes to that control only.
     */
    onClick?: RowClickHandler;

    /**
     * True to show an entry that has an `onClick` dimmed and inert: it takes no focus and does
     * not call the handler. No effect on an entry with no `onClick`.
     */
    disabled?: boolean;

    /** True to leave the entry out. */
    omit?: boolean;
}

export interface ListDisplayProps extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /** Entries to show, in order. Null entries are skipped. */
    entries: ListDisplayEntry[];

    /**
     * True to number the entries, for a ranking or a sequence. Renders an HTML ordered list.
     * The numbers count the entries shown, so a skipped entry leaves no gap in them.
     * Default false.
     */
    numbered?: boolean;

    /** True to draw a rule between entries. Default false. */
    dividers?: boolean;

    /** Size of the list - `compact` for smaller text and tighter rows. Default `standard`. */
    size?: Extract<ComponentSize, 'compact' | 'standard'>;

    /**
     * Shown in place of the list when it has no entries to show. Default is to render nothing,
     * as does a blank `emptyText`.
     */
    emptyText?: ReactNode;
}

/**
 * A short, static list of entries, each with a title and optional description, icon and trailing
 * detail: a handful of alerts, recent activity, the results of a search.
 *
 * The list is presentation-only and takes plain data. It renders every entry, at the height its
 * content needs, as an HTML list. Use a {@link DataView} instead for many records: it draws only
 * the rows in view and adds a Store, selection, sorting and grouping.
 *
 * The list fills the width of its container and has no outer margin. Text wraps, breaking within
 * a word if needed, so the list never forces horizontal overflow. Set the `--xh-list-display-*` CSS
 * variables to change its spacing and colors.
 */
export const [ListDisplay, listDisplay] = hoistCmp.withFactory<ListDisplayProps>({
    displayName: 'ListDisplay',
    model: false,
    className: 'xh-list-display',

    render(props, ref) {
        throwIfRowsPassedAsChildren(props.children, 'entries', 'ListDisplay');
        const [
                layoutProps,
                {className, entries, numbered, dividers, size, emptyText, testId, domAttrs}
            ] = splitLayoutProps(props),
            idPrefix = useId(),
            // Each entry keeps its index in `entries`, as a stable key.
            visible = (entries ?? [])
                .map((entry, index) => ({entry, index}))
                .filter(({entry}) => entry && !entry.omit),
            rootProps = (...classes: string[]) =>
                mergeDeep(
                    {className: classNames(className, classes)},
                    {style: layoutProps},
                    {[TEST_ID]: testId, ...domAttrs}
                );

        if (isEmpty(visible)) {
            return isBlankNode(emptyText)
                ? null
                : div({ref, ...rootProps('xh-list-display--empty'), children: emptyText});
        }

        const shown = visible.map(it => it.entry),
            marker = markerType(shown, numbered),
            list = numbered ? ol : ul;

        // An explicit role keeps list semantics in browsers that drop them with `list-style: none`.
        return list({
            ref,
            role: 'list',
            ...rootProps(
                size === 'compact' && 'xh-list-display--compact',
                dividers && 'xh-list-display--dividers',
                shown.some(it => it.onClick) && 'xh-list-display--clickable'
            ),
            children: visible.map(({entry, index}, position) =>
                renderEntry(entry, `${idPrefix}-${index}`, position, marker)
            )
        });
    }
});

//------------------
// Implementation
//------------------
/** What leads each entry of a list: its number, its icon, a bar in its intent color, or nothing. */
type MarkerType = 'number' | 'icon' | 'accent';

/**
 * One type for the whole list, so the text of every entry starts at the same place. An entry
 * with nothing to show in the marker keeps its space.
 */
function markerType(entries: ListDisplayEntry[], numbered: boolean): MarkerType {
    if (numbered) return 'number';
    if (entries.some(it => it.icon)) return 'icon';
    if (entries.some(it => it.intent)) return 'accent';
    return null;
}

function markerContent(entry: ListDisplayEntry, position: number, marker: MarkerType): ReactNode {
    if (marker === 'number') return position + 1;
    if (marker !== 'icon') return null;
    // A dot carries the intent of an entry with no icon, drawn in the marker's color.
    return entry.icon ?? (entry.intent ? span({className: 'xh-list-display__dot'}) : null);
}

function renderEntry(entry: ListDisplayEntry, id: string, position: number, marker: MarkerType) {
    const {title, description, detail, intent, onClick, disabled} = entry,
        isButton = !!onClick,
        isDisabled = isButton && !!disabled,
        hasDescription = !isBlankNode(description),
        descriptionId = `${id}-description`,
        {rowProps, buttonProps} = clickableRowProps(onClick, disabled);

    return li({
        key: id,
        className: classNames(
            'xh-list-display__entry',
            intent && `xh-list-display__entry--intent-${intent}`,
            isButton && !isDisabled && 'xh-list-display__entry--clickable',
            isDisabled && 'xh-list-display__entry--disabled'
        ),
        children: div({
            className: 'xh-list-display__entry-inner',
            ...rowProps,
            children: [
                // Decorative: the list itself gives each entry's position to a screen reader.
                div({
                    omit: !marker,
                    className: `xh-list-display__marker xh-list-display__marker--${marker}`,
                    'aria-hidden': true,
                    children: markerContent(entry, position, marker)
                }),
                div({
                    className: 'xh-list-display__content',
                    children: [
                        div({
                            omit: !isButton && isBlankNode(title) && isBlankNode(detail),
                            className: 'xh-list-display__header',
                            children: [
                                // Kept when blank on a clickable entry, as it is the button.
                                div({
                                    omit: !isButton && isBlankNode(title),
                                    className: 'xh-list-display__title',
                                    ...buttonProps,
                                    'aria-describedby':
                                        isButton && hasDescription ? descriptionId : null,
                                    children: title
                                }),
                                div({
                                    omit: isBlankNode(detail),
                                    className: 'xh-list-display__detail',
                                    children: detail
                                })
                            ]
                        }),
                        div({
                            omit: !hasDescription,
                            id: isButton ? descriptionId : null,
                            className: 'xh-list-display__description',
                            children: description
                        })
                    ]
                })
            ]
        })
    });
}
