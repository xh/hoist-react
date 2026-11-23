/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {isFunction, isNil, uniq} from 'lodash';
import type {
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent as ReactMouseEvent,
    MutableRefObject,
    ReactNode
} from 'react';
import {useId, useLayoutEffect, useRef, useState} from 'react';

import {div, htmlButton} from '@xh/hoist/cmp/layout';
import type {BoxProps, HoistModel, HoistProps} from '@xh/hoist/core';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import type {DragEndEvent, DragOverEvent, DragStartEvent} from '@xh/hoist/kit/dnd-kit';
import {dragDropProvider, useSortable} from '@xh/hoist/kit/dnd-kit';
import {TEST_ID, mergeDeep, throwIf} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import {DND_PLUGINS, DND_SENSORS, DND_TRANSITION} from './impl/DndDefaults';
import type {SortableKey} from './impl/DndUtils';
import {moveItem, stopDragKeys} from './impl/DndUtils';
import './SortableList.scss';

export type {SortableKey};

export interface SortableListProps<T = any> extends HoistProps<HoistModel>, BoxProps {
    /**
     * Items in display order. Omit when using `bind`. Named `value`, not `items`, which Hoist's
     * element factories reserve as an alias for `children`.
     */
    value?: T[];

    /** Model property holding the items, written with the new order on each reorder. */
    bind?: string;

    /** Property name or function giving each item a stable, unique key. Default 'id'. */
    itemKey?: string | ((item: T) => string | number);

    /** Renders one item's content. The list adds the handle and drag behavior around it. */
    renderItem: (item: T, ctx: SortableItemContext) => ReactNode;

    /**
     * Content drawn under an open item's row at the list's full width, e.g. an editor. Setting it
     * makes items expandable: each gets a chevron that opens and closes its detail.
     */
    renderDetail?: (item: T) => ReactNode;

    /**
     * Items that open and close a detail with a chevron. Default: every item, when `renderDetail`
     * is set. Any other item shows its detail whenever `renderDetail` returns one, with no
     * chevron - pass `() => false` for details that are always shown.
     */
    isItemExpandable?: (item: T) => boolean;

    /** Keys of the open items, to control them. Omit to let the list keep its own. */
    expandedKeys?: SortableKey[];

    /** Called with the keys of the open items whenever a user opens or closes one. */
    onExpandedChange?: (keys: SortableKey[]) => void;

    /** True to let several items be open at once. Default false - opening one closes the other. */
    multiExpand?: boolean;

    /**
     * True (default) to open and close an expandable item on a click on its row, outside its
     * controls. Applies only with a separate handle - never with `handle: 'item'`.
     */
    toggleOnRowClick?: boolean;

    /** Called once per completed reorder - never mid-drag, on cancel, or for a drop in place. */
    onReorder?: (e: SortableReorderEvent<T>) => void;

    /** Default 'vertical'. */
    orientation?: 'vertical' | 'horizontal';

    /** Horizontal only - true to wrap items onto multiple rows. */
    wrap?: boolean;

    /**
     * Where users grab an item. 'item' makes the whole item the handle - pointerdown on a button,
     * input or link inside it never starts a drag. 'custom' places no handle; pass
     * `ctx.handleRef` to the element users should grab. Default 'start'.
     */
    handle?: 'start' | 'end' | 'item' | 'custom';

    /** Items that can't be picked up. Other items still move past them. */
    isItemDisabled?: (item: T) => boolean;

    /** True to disable all reordering. */
    disabled?: boolean;

    /** True for a 24px minimum item height, rather than 30px. */
    compact?: boolean;

    /** Name of an item in screen reader announcements. Default: its key. */
    getItemLabel?: (item: T) => string;
}

export interface SortableItemContext {
    index: number;

    /** True for the item being dragged. */
    isDragging: boolean;

    isDisabled: boolean;

    /** For `handle: 'custom'` - the ref for the element users should grab. */
    handleRef: (el: Element) => void;
}

export interface SortableReorderEvent<T = any> {
    item: T;
    fromIndex: number;
    toIndex: number;

    /** All items in their new order. */
    items: T[];

    source: 'pointer' | 'keyboard';
}

/**
 * A list users reorder by dragging an item, or with the keyboard. The caller renders each item; the
 * list supplies the handle, the lifted item, the drop placeholder, auto-scrolling and screen reader
 * announcements.
 *
 * The list is controlled. It shows the live order only while a drag is in progress. On each completed
 * reorder it writes the new order to `bind`, if set, and calls `onReorder`. A caller that applies
 * neither sees the item return to its place.
 *
 * Keyboard: Space or Enter on a handle lifts the item, arrow keys move it, Space or Enter drops it
 * and Escape cancels. Alt with an arrow key moves the focused item one place at once. Keys the list
 * handles stop propagating.
 */
export const [SortableList, sortableList] = hoistCmp.withFactory<SortableListProps>({
    displayName: 'SortableList',
    // Context model, if any, is only read for `bind`.
    model: uses('*', {optional: true, publishMode: 'none'}),
    className: 'xh-sortable-list',

    render(props, ref) {
        const [
                layoutProps,
                {
                    model,
                    className,
                    style,
                    value,
                    bind,
                    itemKey = 'id',
                    renderItem,
                    renderDetail,
                    isItemExpandable,
                    expandedKeys,
                    onExpandedChange,
                    multiExpand,
                    toggleOnRowClick = true,
                    onReorder,
                    orientation = 'vertical',
                    wrap,
                    handle = 'start',
                    isItemDisabled,
                    disabled,
                    compact,
                    getItemLabel,
                    testId,
                    domAttrs,
                    ...restProps
                }
            ] = splitLayoutProps(props),
            items: any[] = (model && bind ? model[bind] : value) ?? [],
            keys: SortableKey[] = items.map(it =>
                isFunction(itemKey) ? itemKey(it) : it?.[itemKey]
            ),
            horizontal = orientation === 'horizontal',
            [keyboardDrag, setKeyboardDrag] = useState(false),
            // Live order during a drag - React renders it, so dnd-kit never moves the DOM itself.
            [pendingKeys, setPendingKeys] = useState<SortableKey[]>(null),
            dragSource = useRef<SortableReorderEvent['source']>('pointer'),
            focusKey = useRef<SortableKey>(null),
            [ownExpandedKeys, setOwnExpandedKeys] = useState<SortableKey[]>([]),
            openKeys = expandedKeys ?? ownExpandedKeys,
            latest = useRef({keys, pendingKeys});

        latest.current = {keys, pendingKeys};
        throwIf(keys.some(isNil), 'SortableList requires a key for every item - see `itemKey`.');
        throwIf(uniq(keys).length !== keys.length, 'SortableList item keys must be unique.');

        const reorder = (
            fromIndex: number,
            toIndex: number,
            source: SortableReorderEvent['source']
        ) => {
            if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
            const next = [...items],
                [item] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, item);
            if (model && bind) model.setBindable(bind, next);
            onReorder?.({item, fromIndex, toIndex, items: next, source});
        };

        const toggleExpanded = (key: SortableKey) => {
            const next = openKeys.includes(key)
                ? openKeys.filter(it => it !== key)
                : multiExpand
                  ? [...openKeys, key]
                  : [key];
            if (expandedKeys === undefined) setOwnExpandedKeys(next);
            onExpandedChange?.(next);
        };

        const onDragStart = (e: DragStartEvent) => {
            const kb = e.nativeEvent instanceof KeyboardEvent;
            dragSource.current = kb ? 'keyboard' : 'pointer';
            setKeyboardDrag(kb);
        };

        const onDragOver = (e: DragOverEvent) => {
            e.preventDefault();
            const {source, target} = e.operation;
            if (!source || !target) return;
            const order = latest.current.pendingKeys ?? latest.current.keys,
                next = moveItem({order}, source.id, 'order', target.id).order;
            if (next !== order) setPendingKeys(next);
        };

        const onDragEnd = (e: DragEndEvent) => {
            const {keys, pendingKeys} = latest.current,
                key = e.operation.source?.id;
            setKeyboardDrag(false);
            setPendingKeys(null);
            if (e.canceled || !pendingKeys) return;
            reorder(keys.indexOf(key), pendingKeys.indexOf(key), dragSource.current);
        };

        const divProps = mergeDeep(
            {
                className: classNames(
                    className,
                    `xh-sortable-list--${orientation}`,
                    `xh-sortable-list--handle-${handle}`,
                    horizontal && wrap && 'xh-sortable-list--wrap',
                    compact && 'xh-sortable-list--compact',
                    keyboardDrag && 'xh-sortable-list--keyboard-drag',
                    disabled && 'xh-sortable-list--disabled'
                )
            },
            {style: {...style, ...layoutProps}},
            {[TEST_ID]: testId, ...domAttrs},
            restProps
        );

        const shownKeys = pendingKeys ?? keys;
        return dragDropProvider({
            sensors: DND_SENSORS,
            plugins: DND_PLUGINS,
            onDragStart,
            onDragOver,
            onDragEnd,
            children: div({
                ref,
                role: 'list',
                ...divProps,
                children: shownKeys.map((key, index) => {
                    const item = items[keys.indexOf(key)],
                        expandable =
                            !!renderDetail && (isItemExpandable ? isItemExpandable(item) : true);
                    return sortableItem({
                        key,
                        listItem: item,
                        itemKey: key,
                        index,
                        count: shownKeys.length,
                        label: getItemLabel ? getItemLabel(item) : String(key),
                        handle,
                        horizontal,
                        itemDisabled: !!isItemDisabled?.(item),
                        listDisabled: !!disabled,
                        keyboardDrag,
                        focusKey,
                        renderItem,
                        renderDetail,
                        expandable,
                        expanded: expandable && openKeys.includes(key),
                        rowToggle: expandable && toggleOnRowClick && handle !== 'item',
                        onToggle: () => toggleExpanded(key),
                        onMove: (to: number) => {
                            focusKey.current = key;
                            reorder(index, to, 'keyboard');
                        }
                    });
                })
            })
        });
    }
});

//------------------
// Implementation
//------------------
// A click on one of these, inside a row, does its own job and never toggles the row.
const ROW_CLICK_IGNORED =
    'button, a, input, select, textarea, [role=button], [role=combobox], [role=listbox], ' +
    '[contenteditable], .xh-chip, .xh-input';

// A non-expandable item shows its detail whenever `renderDetail` returns one.
function fixedDetail(item: any, renderDetail: SortableListProps['renderDetail']) {
    const detail = renderDetail?.(item);
    return isNil(detail) ? null : div({className: 'xh-sortable-list__detail', children: detail});
}

// Pointer travel between press and click beyond which the click ended a drag, not a tap.
const DRAG_DISTANCE = 4;

interface SortableItemProps extends HoistProps {
    listItem: any;
    itemKey: SortableKey;
    index: number;
    count: number;
    label: string;
    handle: SortableListProps['handle'];
    horizontal: boolean;
    itemDisabled: boolean;
    listDisabled: boolean;
    keyboardDrag: boolean;
    /** Key of the item to refocus once it renders in its new place - React's move drops focus. */
    focusKey: MutableRefObject<SortableKey>;
    renderItem: SortableListProps['renderItem'];
    renderDetail: SortableListProps['renderDetail'];
    expandable: boolean;
    expanded: boolean;
    /** True to open and close the item on a click on its row. */
    rowToggle: boolean;
    onToggle: () => void;
    onMove: (toIndex: number) => void;
}

const sortableItem = hoistCmp.factory<SortableItemProps>({
    displayName: 'SortableItem',
    model: false,

    render({
        listItem: item,
        itemKey,
        index,
        count,
        label,
        handle,
        horizontal,
        itemDisabled,
        listDisabled,
        keyboardDrag,
        focusKey,
        renderItem,
        renderDetail,
        expandable,
        expanded,
        rowToggle,
        onToggle,
        onMove
    }) {
        const isDisabled = itemDisabled || listDisabled,
            activator = useRef<Element>(null),
            pointerDown = useRef<{x: number; y: number}>(null),
            detailId = useId(),
            sortable = useSortable({
                id: itemKey,
                index,
                data: {label, count},
                disabled: isDisabled ? {draggable: true, droppable: false} : false,
                transition: DND_TRANSITION
            }),
            handleRef = (el: Element) => {
                activator.current = el;
                if (el && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', label);
                sortable.handleRef(el);
            },
            itemRef = (el: Element) => {
                if (handle === 'item') activator.current = el;
                sortable.ref(el);
            };

        useLayoutEffect(() => {
            if (focusKey.current !== itemKey) return;
            focusKey.current = null;
            (activator.current as HTMLElement)?.focus();
        });

        const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
            if (e.target !== activator.current) return;
            const {key} = e,
                fwd = horizontal ? 'ArrowRight' : 'ArrowDown',
                back = horizontal ? 'ArrowLeft' : 'ArrowUp';

            if (e.altKey && !keyboardDrag && (key === fwd || key === back)) {
                e.preventDefault();
                e.stopPropagation();
                if (!isDisabled) {
                    const to = key === fwd ? index + 1 : index - 1;
                    if (to >= 0 && to < count) onMove(to);
                }
            } else if (!isDisabled) {
                stopDragKeys(e, keyboardDrag);
            }
        };

        const onRowClick = (e: ReactMouseEvent<HTMLDivElement>) => {
            const target = e.target as Element,
                start = pointerDown.current,
                selection = window.getSelection();
            pointerDown.current = null;
            if (
                !rowToggle ||
                // React carries a click from a portal - a select's menu, a popover - up to the row.
                !e.currentTarget.contains(target) ||
                target.closest(ROW_CLICK_IGNORED) ||
                activator.current?.contains(target) ||
                (selection && !selection.isCollapsed && selection.toString()) ||
                (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_DISTANCE)
            ) {
                return;
            }
            onToggle();
        };

        const ctx: SortableItemContext = {
                index,
                isDragging: sortable.isDragging,
                isDisabled,
                handleRef
            },
            showHandle = handle === 'start' || handle === 'end',
            grip = showHandle
                ? div({
                      ref: handleRef,
                      className: 'xh-sortable-list__handle',
                      'aria-label': label,
                      tabIndex: isDisabled ? -1 : 0,
                      children: itemDisabled ? Icon.lock() : Icon.gripVertical()
                  })
                : null,
            expander = expandable
                ? htmlButton({
                      type: 'button',
                      className: classNames(
                          'xh-sortable-list__expander',
                          expanded && 'xh-sortable-list__expander--open'
                      ),
                      'aria-expanded': expanded,
                      'aria-controls': expanded ? detailId : undefined,
                      'aria-label': `${label} details`,
                      onClick: onToggle,
                      children: Icon.chevronDown()
                  })
                : null;

        return div({
            ref: itemRef,
            role: 'listitem',
            className: classNames(
                'xh-sortable-list__item',
                sortable.isDragging && 'xh-sortable-list__item--dragging',
                itemDisabled && 'xh-sortable-list__item--disabled',
                rowToggle && 'xh-sortable-list__item--row-toggle'
            ),
            onKeyDown,
            children: [
                div({
                    className: 'xh-sortable-list__row',
                    onPointerDown: e => (pointerDown.current = {x: e.clientX, y: e.clientY}),
                    onClick: onRowClick,
                    children: [
                        handle === 'start' ? grip : null,
                        div({
                            className: 'xh-sortable-list__content',
                            children: renderItem(item, ctx)
                        }),
                        expander,
                        handle === 'end' ? grip : null
                    ]
                }),
                expanded
                    ? div({
                          id: detailId,
                          role: 'region',
                          'aria-label': `${label} details`,
                          className: 'xh-sortable-list__detail',
                          children: renderDetail(item)
                      })
                    : expandable
                      ? null
                      : fixedDetail(item, renderDetail)
            ]
        });
    }
});
