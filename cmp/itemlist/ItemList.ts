/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {isEmpty} from 'lodash';
import type {KeyboardEvent, ReactElement, ReactNode} from 'react';

import {div, li, ol, ul} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import type {
    ComponentSize,
    DomAttrsProps,
    HoistProps,
    Intent,
    LayoutProps,
    TestSupportProps
} from '@xh/hoist/core';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {isBlankNode, splitLayoutProps} from '@xh/hoist/utils/react';

import './ItemList.scss';

/**
 * One entry in an {@link ItemList}.
 *
 * A `title`, `description` or `detail` that is null, a boolean or a blank string renders
 * nothing and leaves no gap. The list skips an entry with all three blank.
 */
export interface ItemListEntry {
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

    /** Icon shown before the text. Not shown in an `ordered` list, which shows numbers. */
    icon?: ReactElement;

    /**
     * Flags the entry with a semantic color on its icon or number. In a list where no entry has
     * an icon or number, it draws a thin colored bar before the text instead. Does not color the
     * text, so say what the color means in the text as well.
     */
    intent?: Intent;

    /**
     * True to show the entry dimmed and leave it out of `onEntryClick`: it is not focusable and
     * does not call the handler. No effect in a list with no `onEntryClick`.
     */
    disabled?: boolean;

    /** True to leave the entry out. */
    omit?: boolean;
}

export interface ItemListProps extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /** Entries to show, in order. Null entries are skipped. */
    entries: ItemListEntry[];

    /**
     * True to number the entries, for a ranking or a sequence. Renders an HTML ordered list.
     * The numbers count the entries shown, so a skipped entry leaves no gap in them.
     * Default false.
     */
    ordered?: boolean;

    /** True to draw a rule between entries. Default false. */
    dividers?: boolean;

    /** Size of the list - `compact` for smaller text and tighter rows. Default `standard`. */
    size?: Extract<ComponentSize, 'compact' | 'standard'>;

    /**
     * Shown in place of the list when it has no entries to show. Default is to render nothing,
     * as does a blank `emptyText`.
     */
    emptyText?: ReactNode;

    /**
     * Handler for a click or Enter/Space keypress on an entry. Makes every entry that is not
     * `disabled` a focusable button with a hover style.
     *
     * Called with the entry and its index in the `entries` array as given. That index counts
     * null and omitted entries, so it also finds the source of an entry in an array that
     * `entries` was mapped from. It can differ from the number an `ordered` list shows.
     */
    onEntryClick?: (entry: ItemListEntry, index: number) => void;
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
 * a word if needed, so the list never forces horizontal overflow. Set the `--xh-item-list-*` CSS
 * variables to change its spacing and colors.
 */
export const [ItemList, itemList] = hoistCmp.withFactory<ItemListProps>({
    displayName: 'ItemList',
    model: false,
    className: 'xh-item-list',

    render(props, ref) {
        const [
                layoutProps,
                {
                    className,
                    entries,
                    ordered,
                    dividers,
                    size,
                    emptyText,
                    onEntryClick,
                    testId,
                    domAttrs
                }
            ] = splitLayoutProps(props),
            // Each entry keeps its index in `entries`, as the handler reports that index.
            visible = (entries ?? [])
                .map((entry, index) => ({entry, index}))
                .filter(({entry}) => entry && !entry.omit && !isBlankEntry(entry)),
            rootProps = (...classes: string[]) =>
                mergeDeep(
                    {className: classNames(className, classes)},
                    {style: layoutProps},
                    {[TEST_ID]: testId, ...domAttrs}
                );

        if (isEmpty(visible)) {
            return isBlankNode(emptyText)
                ? null
                : div({ref, ...rootProps('xh-item-list--empty'), item: emptyText});
        }

        const marker = markerType(
                visible.map(it => it.entry),
                ordered
            ),
            list = ordered ? ol : ul;

        // An explicit role keeps list semantics in browsers that drop them with `list-style: none`.
        return list({
            ref,
            role: 'list',
            ...rootProps(
                size === 'compact' && 'xh-item-list--compact',
                dividers && 'xh-item-list--dividers',
                onEntryClick && 'xh-item-list--clickable'
            ),
            items: visible.map(({entry, index}, position) =>
                renderEntry(entry, index, position, marker, onEntryClick)
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
function markerType(entries: ItemListEntry[], ordered: boolean): MarkerType {
    if (ordered) return 'number';
    if (entries.some(it => it.icon)) return 'icon';
    if (entries.some(it => it.intent)) return 'accent';
    return null;
}

function isBlankEntry({title, description, detail}: ItemListEntry): boolean {
    return isBlankNode(title) && isBlankNode(description) && isBlankNode(detail);
}

function renderEntry(
    entry: ItemListEntry,
    index: number,
    position: number,
    marker: MarkerType,
    onEntryClick: ItemListProps['onEntryClick']
) {
    const {title, description, detail, icon, intent, disabled} = entry,
        isDisabled = !!onEntryClick && !!disabled,
        clickProps = isDisabled
            ? {role: 'button', 'aria-disabled': true}
            : onEntryClick
              ? {
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => onEntryClick(entry, index),
                    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onEntryClick(entry, index);
                        }
                    }
                }
              : {};

    return li({
        key: index,
        className: classNames(
            'xh-item-list__entry',
            intent && `xh-item-list__entry--intent-${intent}`,
            isDisabled && 'xh-item-list__entry--disabled'
        ),
        item: div({
            className: 'xh-item-list__entry-inner',
            ...clickProps,
            items: [
                // Decorative: the list itself gives each entry's position to a screen reader.
                div({
                    omit: !marker,
                    className: `xh-item-list__marker xh-item-list__marker--${marker}`,
                    'aria-hidden': true,
                    item: marker === 'number' ? position + 1 : marker === 'icon' ? icon : null
                }),
                div({
                    className: 'xh-item-list__content',
                    items: [
                        div({
                            omit: isBlankNode(title) && isBlankNode(detail),
                            className: 'xh-item-list__header',
                            items: [
                                div({
                                    omit: isBlankNode(title),
                                    className: 'xh-item-list__title',
                                    item: title
                                }),
                                div({
                                    omit: isBlankNode(detail),
                                    className: 'xh-item-list__detail',
                                    item: detail
                                })
                            ]
                        }),
                        div({
                            omit: isBlankNode(description),
                            className: 'xh-item-list__description',
                            item: description
                        })
                    ]
                })
            ]
        })
    });
}
