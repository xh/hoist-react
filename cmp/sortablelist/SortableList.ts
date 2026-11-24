/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {isEmpty, isFunction, isNil, over, uniq} from 'lodash';
import type {
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent as ReactMouseEvent,
    MutableRefObject,
    ReactNode
} from 'react';
import {useId, useLayoutEffect, useMemo, useRef, useState} from 'react';

import {div, htmlButton, span} from '@xh/hoist/cmp/layout';
import type {BoxProps, HoistModel, HoistProps} from '@xh/hoist/core';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import type {
    DragDropProviderProps,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    UseSortableInput
} from '@xh/hoist/kit/dnd-kit';
import {dragDropProvider, useSortable} from '@xh/hoist/kit/dnd-kit';
import {TEST_ID, mergeDeep, throwIf} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import {
    DND_INSTRUCTIONS,
    DND_SCROLL_ACCELERATION,
    DND_SENSORS,
    DND_TRANSITION,
    dndPlugins
} from './impl/DndDefaults';
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
    itemRenderer: (item: T, ctx: SortableItemContext) => ReactNode;

    /**
     * Content drawn under an open item's row at the list's full width, e.g. an editor. Setting it
     * makes items expandable: each gets a chevron that opens and closes its detail.
     */
    detailRenderer?: (item: T) => ReactNode;

    /**
     * Items that open and close a detail with a chevron. Default: every item, when
     * `detailRenderer` is set. Any other item shows its detail whenever `detailRenderer` returns
     * one, with no chevron - pass `() => false` for details that are always shown.
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

    /**
     * Items that can be dragged. Default: every item. Others show a lock in place of their grip,
     * and items that can move still move past them.
     */
    isItemMovable?: (item: T) => boolean;

    /** True to disable all reordering. */
    disabled?: boolean;

    /** True for a 24px minimum item height, rather than 30px. */
    compact?: boolean;

    /**
     * Speed of the auto-scroll while a dragged item is near the edge of the list or a scrolling
     * container. Default 15 - higher is faster.
     */
    scrollAcceleration?: number;

    /**
     * How the list frames its items. 'plain' (default) draws nothing - the caller's content does.
     * 'divided' draws one rounded border around the list and lines between items, which sit flush.
     * 'spaced' sets the items apart, each in its own rounded border.
     */
    variant?: 'plain' | 'divided' | 'spaced';

    /** Name of an item in screen reader announcements. Default: its key. */
    getItemLabel?: (item: T) => string;

    /**
     * Called when a user removes an item, by its remove button or Delete or Backspace on its
     * handle. Setting it, or `removable`, shows those controls. With `bind`, the list writes the shortened list
     * first; otherwise apply `e.items` yourself.
     */
    onRemove?: (e: SortableRemoveEvent<T>) => void;

    /** True to let users remove items, as `onRemove` does - for a list that only needs `bind`. */
    removable?: boolean;

    /**
     * True to show remove buttons only while their item is hovered or holds keyboard focus, for a
     * quieter list. Always shown on touch devices, which have no hover.
     */
    showRemoveOnHover?: boolean;

    /** Items that can be removed. Default: every item, when `removable` or `onRemove` is set. */
    isItemRemovable?: (item: T) => boolean;

    /**
     * Renders the Add row's control in place of the built-in button - a select, picker or menu.
     * Call `ctx.add` with each new item. Setting it shows the Add row.
     */
    addRenderer?: (ctx: SortableAddContext<T>) => ReactNode;

    /**
     * For the built-in Add button: returns the new item, or a promise of it, or null to add
     * nothing. The list focuses the new item and opens its detail. Setting it shows the Add row.
     * Ignored when `addRenderer` is set.
     */
    getNewItem?: () => T | Promise<T>;

    /** Label of the built-in Add button. Default 'Add...'. */
    addText?: ReactNode;

    /**
     * Called after an item is added, by `getNewItem` or `addRenderer`. With `bind`, the list
     * writes the longer list first; otherwise add `e.item` to `value` yourself.
     */
    onAdd?: (e: SortableAddEvent<T>) => void;

    /** Shown in place of the items while there are none. */
    emptyText?: ReactNode;

    /**
     * Escape-hatch props for dnd-kit's `DragDropProvider`, for options this component doesn't map.
     * `sensors`, `plugins` and `modifiers` here replace Hoist's. Drag event handlers run after
     * Hoist's own. Use with care - they can interfere with the list's behavior.
     */
    dndProviderProps?: Partial<DragDropProviderProps>;

    /**
     * Escape-hatch options for each item's dnd-kit `useSortable`, such as `collisionDetector`. The
     * list's own `id`, `index`, `data` and `disabled` always win.
     */
    sortableProps?: Partial<UseSortableInput>;
}

export interface SortableItemContext {
    index: number;

    /** True for the item being dragged. */
    isDragging: boolean;

    /** False for an item that can't be dragged, or any item in a disabled list. */
    isMovable: boolean;

    /** For `handle: 'custom'` - the ref for the element users should grab. */
    handleRef: (el: Element) => void;
}

export interface SortableRemoveEvent<T = any> {
    item: T;
    index: number;

    /** All items, without the removed one. */
    items: T[];
}

export interface SortableAddContext<T = any> {
    /**
     * Appends `item` - through `bind` when set - then calls `onAdd` and announces it. When the
     * list has a `detailRenderer`, focuses the new item and opens an expandable detail, closing any
     * other unless `multiExpand`. Otherwise focus stays in the control, ready for the next pick -
     * or moves to the new item, if the add leaves the row with no control.
     */
    add: (item: T) => void;

    /**
     * The current items, e.g. to leave ones already chosen out of a picker. Named `value`, as on
     * the list, since element factories read an `items` prop as `children`.
     */
    value: T[];

    /** True while the list is disabled. */
    disabled: boolean;
}

export interface SortableAddEvent<T = any> {
    item: T;
    index: number;

    /** All items, with the added one. */
    items: T[];
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
                    itemRenderer,
                    detailRenderer,
                    isItemExpandable,
                    expandedKeys,
                    onExpandedChange,
                    multiExpand,
                    toggleOnRowClick = true,
                    onReorder,
                    orientation = 'vertical',
                    wrap,
                    handle = 'start',
                    isItemMovable,
                    disabled,
                    compact,
                    scrollAcceleration = DND_SCROLL_ACCELERATION,
                    variant = 'plain',
                    getItemLabel,
                    onRemove,
                    removable,
                    showRemoveOnHover,
                    isItemRemovable,
                    addRenderer,
                    getNewItem,
                    addText = 'Add...',
                    onAdd,
                    emptyText,
                    dndProviderProps,
                    sortableProps,
                    testId,
                    domAttrs,
                    ...restProps
                }
            ] = splitLayoutProps(props),
            items: any[] = (model && bind ? model[bind] : value) ?? [],
            keyOf = (it: any): SortableKey => (isFunction(itemKey) ? itemKey(it) : it?.[itemKey]),
            labelOf = (it: any): string => (getItemLabel ? getItemLabel(it) : String(keyOf(it))),
            keys: SortableKey[] = items.map(keyOf),
            horizontal = orientation === 'horizontal',
            [keyboardDrag, setKeyboardDrag] = useState(false),
            keyboardDragging = useRef(false),
            // Live order during a drag - React renders it, so dnd-kit never moves the DOM itself.
            [pendingKeys, setPendingKeys] = useState<SortableKey[]>(null),
            dragSource = useRef<SortableReorderEvent['source']>('pointer'),
            focusKey = useRef<SortableKey>(null),
            // Set from the start of a drag until just after it ends, so its closing click is ignored.
            dragging = useRef(false),
            [ownExpandedKeys, setOwnExpandedKeys] = useState<SortableKey[]>([]),
            openKeys = expandedKeys ?? ownExpandedKeys,
            [announcement, setAnnouncement] = useState(''),
            addRef = useRef<any>(null),
            focusAdd = useRef(false),
            latest = useRef({items, keys, pendingKeys, openKeys}),
            // Stable across renders, so a list re-render leaves rows with unchanged props alone.
            actions = useRef<SortableItemActions>(null),
            plugins = useMemo(
                () => dndPlugins({scrollAcceleration, instructions: INSTRUCTIONS}),
                [scrollAcceleration]
            );

        latest.current = {items, keys, pendingKeys, openKeys};
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

        const setOpenKeys = (next: SortableKey[]) => {
            if (expandedKeys === undefined) setOwnExpandedKeys(next);
            onExpandedChange?.(next);
        };

        const toggleExpanded = (key: SortableKey) => {
            const {openKeys} = latest.current;
            setOpenKeys(
                openKeys.includes(key)
                    ? openKeys.filter(it => it !== key)
                    : multiExpand
                      ? [...openKeys, key]
                      : [key]
            );
        };

        const isExpandable = (it: any) =>
            !!detailRenderer && (isItemExpandable ? isItemExpandable(it) : true);

        // Focus goes to the item that takes the removed one's place, else the one before it.
        const remove = (key: SortableKey) => {
            const index = keys.indexOf(key),
                item = items[index],
                next = items.filter((_, idx) => idx !== index),
                neighbor = keys[index + 1] ?? keys[index - 1];
            if (neighbor != null) {
                focusKey.current = neighbor;
            } else {
                focusAdd.current = true;
            }
            if (model && bind) model.setBindable(bind, next);
            setAnnouncement(`Removed ${labelOf(item)}.`);
            onRemove?.({item, index, items: next});
        };

        // A picker keeps focus for the next pick, unless the new item has a detail to fill in. Its
        // control is refocused, as one keyed on its options remounts on each add. The new item
        // takes focus instead if the add leaves the row with no control.
        const add = (added: any, fromPicker: boolean) => {
            if (added == null) return;
            const key = keyOf(added),
                {items, openKeys} = latest.current,
                next = [...items, added];
            focusKey.current = key;
            focusAdd.current = fromPicker && !detailRenderer;
            if (isExpandable(added) && !openKeys.includes(key)) {
                setOpenKeys(multiExpand ? [...openKeys, key] : [key]);
            }
            if (model && bind) model.setBindable(bind, next);
            setAnnouncement(`Added ${labelOf(added)}.`);
            onAdd?.({item: added, index: next.length - 1, items: next});
        };

        // Runs from an item's layout effect, before the list's own, to win over focusing the item.
        const focusAddControl = (): boolean => {
            if (!focusAdd.current) return false;
            focusAdd.current = false;
            const row: HTMLElement = addRef.current,
                control = row?.matches('button') ? row : row?.querySelector<HTMLElement>(FOCUSABLE);
            control?.focus();
            // A disabled input with a tabindex matches FOCUSABLE but refuses focus.
            return !!control && document.activeElement === control;
        };

        useLayoutEffect(() => {
            focusAddControl();
        });

        const onDragStart = (e: DragStartEvent) => {
            dragging.current = true;
            const kb = e.nativeEvent instanceof KeyboardEvent;
            dragSource.current = kb ? 'keyboard' : 'pointer';
            keyboardDragging.current = kb;
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
            keyboardDragging.current = false;
            setKeyboardDrag(false);
            setPendingKeys(null);
            setTimeout(() => (dragging.current = false));
            if (e.canceled || !pendingKeys) return;
            reorder(keys.indexOf(key), pendingKeys.indexOf(key), dragSource.current);
        };

        actions.current = {
            toggle: toggleExpanded,
            remove,
            focusAddControl,
            move: (key, fromIndex, toIndex) => {
                focusKey.current = key;
                reorder(fromIndex, toIndex, 'keyboard');
            }
        };

        const divProps = mergeDeep(
            {
                className: classNames(
                    className,
                    `xh-sortable-list--${orientation}`,
                    `xh-sortable-list--${variant}`,
                    `xh-sortable-list--handle-${handle}`,
                    horizontal && wrap && 'xh-sortable-list--wrap',
                    compact && 'xh-sortable-list--compact',
                    keyboardDrag && 'xh-sortable-list--keyboard-drag',
                    showRemoveOnHover && 'xh-sortable-list--remove-on-hover',
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
            plugins,
            ...dndProviderProps,
            onDragStart: chain(onDragStart, dndProviderProps?.onDragStart),
            onDragOver: chain(onDragOver, dndProviderProps?.onDragOver),
            onDragEnd: chain(onDragEnd, dndProviderProps?.onDragEnd),
            children: div({
                ref,
                ...divProps,
                children: [
                    div({
                        role: 'list',
                        className: 'xh-sortable-list__items',
                        children: shownKeys.map((key, index) => {
                            const item = items[keys.indexOf(key)],
                                expandable = isExpandable(item);
                            return sortableItem({
                                key,
                                listItem: item,
                                itemKey: key,
                                index,
                                count: shownKeys.length,
                                label: labelOf(item),
                                handle,
                                horizontal,
                                itemFixed: isItemMovable ? !isItemMovable(item) : false,
                                listDisabled: !!disabled,
                                keyboardDragging,
                                focusKey,
                                dragging,
                                sortableProps,
                                itemRenderer,
                                detailRenderer,
                                expandable,
                                expanded: expandable && openKeys.includes(key),
                                rowToggle: expandable && toggleOnRowClick && handle !== 'item',
                                removable:
                                    (removable || !!onRemove) &&
                                    !disabled &&
                                    (isItemRemovable ? isItemRemovable(item) : true),
                                actions
                            });
                        })
                    }),
                    isEmpty(items) && !isNil(emptyText)
                        ? div({className: 'xh-sortable-list__empty', children: emptyText})
                        : null,
                    addRenderer
                        ? div({
                              ref: addRef,
                              className: 'xh-sortable-list__add xh-sortable-list__add--custom',
                              children: addRenderer({
                                  add: it => add(it, true),
                                  value: items,
                                  disabled: !!disabled
                              })
                          })
                        : getNewItem
                          ? htmlButton({
                                ref: addRef,
                                type: 'button',
                                className: 'xh-sortable-list__add',
                                disabled,
                                onClick: async () => add(await getNewItem(), false),
                                children: [Icon.add(), span(addText)]
                            })
                          : null,
                    div({
                        className: 'xh-sortable-list__status',
                        role: 'status',
                        'aria-live': 'polite',
                        children: announcement
                    })
                ]
            })
        });
    }
});

//------------------
// Implementation
//------------------
/** Hoist's handler, then the app's, if set. */
function chain<A extends unknown[]>(
    own: NoInfer<(...args: A) => void>,
    app: (...args: A) => void
): (...args: A) => void {
    return app ? over([own, app]) : own;
}

const INSTRUCTIONS = `${DND_INSTRUCTIONS} Alt with an arrow key moves it one place.`;

const FOCUSABLE =
    'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), ' +
    'a[href], [tabindex]:not([tabindex="-1"])';

// A click on one of these, inside a row, does its own job and never toggles the row.
const ROW_CLICK_IGNORED =
    'button, a, input, select, textarea, [role=button], [role=combobox], [role=listbox], ' +
    '[contenteditable], .xh-chip, .xh-input';

interface ItemDetailProps extends HoistProps {
    listItem: any;
    detailRenderer: SortableListProps['detailRenderer'];
    label: string;
    /** Id for an expanded item's detail region, else null for an always-shown detail. */
    regionId: string;
}

// Its own component, so a row's re-render - at drag start, say - leaves a heavy detail alone. An
// always-shown detail renders only when `detailRenderer` returns one.
const itemDetail = hoistCmp.factory<ItemDetailProps>({
    displayName: 'SortableItemDetail',
    model: false,

    render({listItem, detailRenderer, label, regionId}) {
        const detail = detailRenderer(listItem);
        if (!regionId) {
            return isNil(detail)
                ? null
                : div({className: 'xh-sortable-list__detail', children: detail});
        }
        return div({
            id: regionId,
            role: 'region',
            'aria-label': `${label} details`,
            className: 'xh-sortable-list__detail',
            children: detail
        });
    }
});

interface SortableItemActions {
    toggle: (key: SortableKey) => void;
    remove: (key: SortableKey) => void;
    move: (key: SortableKey, fromIndex: number, toIndex: number) => void;
    /** Focuses the Add row's control if an add asked for it. False unless the control took it. */
    focusAddControl: () => boolean;
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
    /** True for an item that can't be dragged. */
    itemFixed: boolean;
    listDisabled: boolean;
    /** True during a keyboard drag. */
    keyboardDragging: MutableRefObject<boolean>;
    /** Key of the item to refocus once it renders in its new place - React's move drops focus. */
    focusKey: MutableRefObject<SortableKey>;
    /** True during a drag, and until just after it ends. */
    dragging: MutableRefObject<boolean>;
    sortableProps: Partial<UseSortableInput>;
    itemRenderer: SortableListProps['itemRenderer'];
    detailRenderer: SortableListProps['detailRenderer'];
    expandable: boolean;
    expanded: boolean;
    /** True to open and close the item on a click on its row. */
    rowToggle: boolean;
    removable: boolean;
    /** The list's current handlers, read at event time. */
    actions: MutableRefObject<SortableItemActions>;
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
        itemFixed,
        listDisabled,
        keyboardDragging,
        focusKey,
        dragging,
        sortableProps,
        itemRenderer,
        detailRenderer,
        expandable,
        expanded,
        rowToggle,
        removable,
        actions
    }) {
        const isDisabled = itemFixed || listDisabled,
            activator = useRef<Element>(null),
            pointerDown = useRef<{x: number; y: number}>(null),
            detailId = useId(),
            onToggle = () => actions.current.toggle(itemKey),
            onRemove = () => actions.current.remove(itemKey),
            sortable = useSortable({
                transition: DND_TRANSITION,
                ...sortableProps,
                id: itemKey,
                index,
                data: {label, count},
                disabled: isDisabled ? {draggable: true, droppable: false} : false
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
            if (!actions.current.focusAddControl()) (activator.current as HTMLElement)?.focus();
        });

        const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
            if (e.target !== activator.current) return;
            const {key} = e,
                keyboardDrag = keyboardDragging.current,
                fwd = horizontal ? 'ArrowRight' : 'ArrowDown',
                back = horizontal ? 'ArrowLeft' : 'ArrowUp';

            if (removable && !keyboardDrag && (key === 'Delete' || key === 'Backspace')) {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
            } else if (e.altKey && !keyboardDrag && (key === fwd || key === back)) {
                e.preventDefault();
                e.stopPropagation();
                if (!isDisabled) {
                    const to = key === fwd ? index + 1 : index - 1;
                    if (to >= 0 && to < count) actions.current.move(itemKey, index, to);
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
                dragging.current ||
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
                isMovable: !isDisabled,
                handleRef
            },
            showHandle = handle === 'start' || handle === 'end',
            grip = showHandle
                ? div({
                      ref: handleRef,
                      className: 'xh-sortable-list__handle',
                      'aria-label': label,
                      tabIndex: isDisabled ? -1 : 0,
                      children: itemFixed ? Icon.lock() : Icon.gripVertical({prefix: 'fas'})
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
                : null,
            remover = removable
                ? htmlButton({
                      type: 'button',
                      className: 'xh-sortable-list__remove',
                      'aria-label': `Remove ${label}`,
                      onClick: onRemove,
                      children: Icon.delete()
                  })
                : null;

        return div({
            ref: itemRef,
            role: 'listitem',
            className: classNames(
                'xh-sortable-list__item',
                sortable.isDragging && 'xh-sortable-list__item--dragging',
                itemFixed && 'xh-sortable-list__item--fixed',
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
                            children: itemRenderer(item, ctx)
                        }),
                        expander,
                        remover,
                        handle === 'end' ? grip : null
                    ]
                }),
                (expanded || !expandable) && detailRenderer
                    ? itemDetail({
                          listItem: item,
                          detailRenderer,
                          label,
                          regionId: expanded ? detailId : null
                      })
                    : null
            ]
        });
    }
});
