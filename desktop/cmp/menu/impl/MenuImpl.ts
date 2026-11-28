/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PopoverProps} from '@xh/hoist/cmp/popover';
import {popoverImpl} from '@xh/hoist/cmp/popover/impl/PopoverImpl';
import type {Intent} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import classNames from 'classnames';
import {stopRightElementControlEvent} from '@xh/hoist/cmp/menu/impl/Menus';
import '@xh/hoist/desktop/register';
import {useComposedRefs} from '@xh/hoist/utils/react';
import type {
    AnchorHTMLAttributes,
    HTMLAttributes,
    KeyboardEvent,
    MouseEvent,
    ReactNode,
    Ref
} from 'react';
import {createContext, createElement as h, useContext, useEffect, useRef, useState} from 'react';
import '../Menu.scss';

/** A list of menu items, as rendered within a popover or a context menu. */
export interface MenuListProps extends HTMLAttributes<HTMLUListElement> {
    ulRef?: Ref<HTMLUListElement>;
}

/**
 * A single item within a menu, optionally holding a submenu of further items as `children`. Apps
 * describe items with `MenuItem` configs, which `parseMenuItems` renders with this.
 */
export interface MenuItemElementProps extends Omit<AnchorHTMLAttributes<HTMLElement>, 'children'> {
    text?: ReactNode;
    icon?: ReactNode;
    intent?: Intent;
    active?: boolean;
    disabled?: boolean;
    /**
     * Element shown at the right edge of the item, e.g. a keyboard shortcut. A click on a control
     * within it does not reach the item.
     */
    rightElement?: ReactNode;
    /** False to keep the enclosing popover open when the item is clicked. Default true. */
    shouldDismissPopover?: boolean;
    /** Options for the popover that holds this item's submenu. */
    popoverProps?: Pick<
        PopoverProps,
        | 'hoverCloseDelay'
        | 'hoverOpenDelay'
        | 'openOnTargetFocus'
        | 'usePortal'
        | 'popoverClassName'
    >;
    /** Items of a submenu that opens from this item. */
    children?: ReactNode;
}

/** A separator between menu items, or a heading over the items below it when given a `title`. */
export interface MenuDividerElementProps {
    className?: string;
    title?: ReactNode;
}

const CARET_RIGHT_PATH =
    'M11 8c0-.15-.07-.28-.17-.37l-4-3.5A.495.495 0 0 0 6 4.5v7a.495.495 0 0 0 .83.37l4-3.5c.1-.09.17-.22.17-.37';

/** Set by a submenu for the menu list it holds, so ArrowLeft can close it. */
const SubmenuContext = createContext<{close: () => void}>(null);

/** Set by a menu list for its items - true while a typeahead search is in progress. */
const TypeaheadContext = createContext<() => boolean>(null);

/** Milliseconds after the last key typed before a typeahead search starts over. */
const TYPEAHEAD_RESET_MS = 750;

interface Typeahead {
    buffer: string;
    timer: number;
}

type MenuKeyEvent = Pick<
    globalThis.KeyboardEvent,
    'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'preventDefault' | 'stopPropagation'
>;

//------------------------
// Menu list
//------------------------
export const menuList = hoistCmp.factory<MenuListProps>({
    displayName: 'MenuList',
    model: false,
    observer: false,

    render({className, children, ulRef, onKeyDown, ...rest}) {
        const submenu = useContext(SubmenuContext),
            listRef = useRef<HTMLUListElement>(null),
            ref = useComposedRefs(listRef, ulRef),
            typeahead = useRef<Typeahead>({buffer: '', timer: 0});

        // The popover holding the list takes focus itself on opening. Keys sent to it move into
        // the list, unless another list comes first in the popover.
        useEffect(() => {
            const list = listRef.current,
                panel = list?.closest<HTMLElement>('.xh-popover__floating');
            if (!panel || panel.querySelector('[role=menu]') !== list) return;

            const onPanelKeyDown = (e: globalThis.KeyboardEvent) => {
                if (e.target === panel) navigateMenu(e, list, -1, typeahead.current);
            };
            panel.addEventListener('keydown', onPanelKeyDown);
            return () => panel.removeEventListener('keydown', onPanelKeyDown);
        }, []);

        const handleKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
            onKeyDown?.(e);
            const idx = menuItemsOf(e.currentTarget).indexOf(e.target as HTMLElement);
            if (idx < 0) return; // From a nested submenu, which handles its own keys.

            if (e.key === 'ArrowLeft' && submenu) {
                e.preventDefault();
                e.stopPropagation();
                submenu.close();
                return;
            }
            navigateMenu(e, e.currentTarget, idx, typeahead.current);
        };

        return h(
            TypeaheadContext.Provider,
            {value: () => typeahead.current.buffer !== ''},
            h(
                'ul',
                {
                    role: 'menu',
                    ...rest,
                    ref,
                    onKeyDown: handleKeyDown,
                    className: classNames(className, 'xh-menu-list')
                },
                children
            )
        );
    }
});

//------------------------
// Menu item
//------------------------
export const menuItem = hoistCmp.factory<MenuItemElementProps>({
    displayName: 'MenuItem',
    model: false,
    observer: false,

    render(props) {
        const {
            active = false,
            children,
            className,
            disabled = false,
            icon,
            intent,
            rightElement,
            popoverProps,
            shouldDismissPopover = true,
            text,
            ...htmlProps
        } = props;

        const hasSubmenu = children != null,
            isTypingAhead = useContext(TypeaheadContext),
            [subOpen, setSubOpen] = useState(false),
            focusFirstOnOpen = useRef(false),
            liRef = useRef<HTMLLIElement>(null),
            subPopoverRef = useRef<HTMLElement>(null);

        // After a keyboard open, move focus into the submenu once it has rendered. A portaled submenu
        // mounts a render later, so retry for a few frames.
        useEffect(() => {
            if (!subOpen || !focusFirstOnOpen.current) return;
            focusFirstOnOpen.current = false;
            let tries = 0,
                frame: number;
            const tryFocus = () => {
                const list = subPopoverRef.current?.querySelector<HTMLElement>('.xh-menu-list'),
                    first = list ? menuItemsOf(list)[0] : null;
                if (first) {
                    first.focus();
                } else if (++tries < 5) {
                    frame = window.requestAnimationFrame(tryFocus);
                }
            };
            tryFocus();
            return () => window.cancelAnimationFrame(frame);
        }, [subOpen]);

        const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
            htmlProps.onKeyDown?.(e);
            // A key on a control within the right element belongs to that control.
            if (disabled || e.target !== e.currentTarget) return;
            // Space within a typeahead search is part of the search - the list handles it.
            if (e.key === ' ' && isTypingAhead?.()) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                (e.currentTarget as HTMLElement).click();
            } else if (e.key === 'ArrowRight' && hasSubmenu) {
                e.preventDefault();
                e.stopPropagation();
                focusFirstOnOpen.current = true;
                setSubOpen(true);
            }
        };

        const anchor = h(
            'a',
            {
                role: 'menuitem',
                ...htmlProps,
                tabIndex: htmlProps.tabIndex ?? 0,
                onKeyDown,
                onMouseEnter: (e: MouseEvent<HTMLElement>) => {
                    htmlProps.onMouseEnter?.(e);
                    focusOnHover(e.currentTarget);
                },
                'aria-haspopup': hasSubmenu ? 'menu' : undefined,
                'aria-expanded': hasSubmenu ? subOpen : undefined,
                ...(disabled
                    ? {
                          'aria-disabled': true,
                          href: undefined,
                          onClick: undefined,
                          onMouseDown: undefined,
                          onMouseEnter: undefined,
                          onMouseLeave: undefined,
                          tabIndex: -1
                      }
                    : {}),
                className: classNames(
                    'xh-menu-item',
                    intent ? `xh-menu-item--intent-${intent}` : null,
                    {
                        'xh-menu-item--active': active,
                        'xh-menu-item--disabled': disabled,
                        'xh-popover-dismiss': shouldDismissPopover && !disabled && !hasSubmenu
                    },
                    className
                )
            },
            icon != null
                ? h('span', {className: 'xh-menu-item__icon', 'aria-hidden': true}, icon)
                : null,
            h('div', {className: 'xh-menu-item__text'}, text),
            rightElement != null
                ? h(
                      'span',
                      {
                          className: 'xh-menu-item__label',
                          onClick: stopRightElementControlEvent
                      },
                      rightElement
                  )
                : null,
            hasSubmenu ? caretIcon() : null
        );

        if (!hasSubmenu) return h('li', {ref: liRef, role: 'none'}, anchor);

        return h(
            'li',
            {ref: liRef, role: 'none', className: 'xh-menu-item--submenu'},
            popoverImpl({
                interactionKind: 'hover',
                position: 'right-top',
                minimal: true,
                autoFocus: false,
                // A portal keeps the submenu clear of the parent menu, which scrolls and so clips
                // anything inside it. It also positions correctly in a menu anchored at the cursor.
                usePortal: true,
                hoverCloseDelay: 0,
                ...popoverProps,
                disabled,
                isOpen: subOpen,
                onInteraction: open => setSubOpen(open),
                popoverRef: subPopoverRef,
                // Shift up so the submenu's first item lines up with this one.
                offset: {crossAxis: -5},
                popoverClassName: classNames('xh-menu__submenu', popoverProps?.popoverClassName),
                content: h(
                    SubmenuContext.Provider,
                    {
                        value: {
                            close: () => {
                                setSubOpen(false);
                                liRef.current
                                    ?.querySelector<HTMLElement>('[role=menuitem]')
                                    ?.focus();
                            }
                        }
                    },
                    menuList({children})
                ),
                children: anchor
            })
        );
    }
});

//------------------------
// Divider
//------------------------
export const menuDivider = hoistCmp.factory<MenuDividerElementProps>({
    displayName: 'MenuDivider',
    model: false,
    observer: false,

    render({className, title}) {
        return h(
            'li',
            {
                role: 'separator',
                className: classNames(title ? 'xh-menu-header' : 'xh-menu-divider', className)
            },
            title ? h('h6', {className: 'xh-menu-header__title'}, title) : null
        );
    }
});

//------------------------
// Implementation
//------------------------
/** The enabled items of a menu list, excluding those of any nested submenu. */
function menuItemsOf(list: Element): HTMLElement[] {
    return Array.from(
        list.querySelectorAll<HTMLElement>(
            ':scope > li > [role=menuitem], :scope > li > .xh-popover__target-wrapper > [role=menuitem]'
        )
    ).filter(it => it.getAttribute('aria-disabled') !== 'true');
}

/**
 * Move focus within a menu list for a navigation or typeahead key. `idx` is the focused item, or -1
 * when focus is on the popover around the list, before its first item.
 */
function navigateMenu(e: MenuKeyEvent, list: HTMLElement, idx: number, typeahead: Typeahead) {
    const items = menuItemsOf(list);
    if (!items.length) return;

    const focusAt = (i: number) => {
        e.preventDefault();
        e.stopPropagation();
        items[(i + items.length) % items.length].focus();
    };

    switch (e.key) {
        case 'ArrowDown':
            return focusAt(idx + 1);
        case 'ArrowUp':
            return focusAt(idx < 0 ? items.length - 1 : idx - 1);
        case 'Home':
            return focusAt(0);
        case 'End':
            return focusAt(items.length - 1);
    }

    // Typeahead - move to the next item whose text starts with the characters typed. Space
    // activates the focused item, unless it continues a search in progress.
    const isChar = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (!isChar || (e.key === ' ' && !typeahead.buffer)) return;

    e.preventDefault();
    window.clearTimeout(typeahead.timer);
    typeahead.buffer += e.key.toLowerCase();
    typeahead.timer = window.setTimeout(() => (typeahead.buffer = ''), TYPEAHEAD_RESET_MS);

    // Typing one letter repeatedly cycles through the items that start with it.
    const {buffer} = typeahead,
        cycle = [...buffer].every(c => c === buffer[0]),
        search = cycle ? buffer[0] : buffer,
        start = cycle ? idx + 1 : Math.max(idx, 0),
        ordered = [...items.slice(start), ...items.slice(0, start)],
        match = ordered.find(it => it.textContent.trim().toLowerCase().startsWith(search));
    if (match) focusAt(items.indexOf(match));
}

/**
 * Focus an item under the pointer, so the keyboard carries on from it and one item shows as
 * current. Only when focus is already in a menu, or on the popover holding this item, so a menu
 * never takes focus from an input beside it.
 */
function focusOnHover(item: HTMLElement) {
    const active = document.activeElement as HTMLElement;
    if (!active || active === item) return;
    const inMenu = active.closest('[role=menu]') != null,
        onPanel = active.classList.contains('xh-popover__floating') && active.contains(item);
    if (inMenu || onPanel) item.focus({preventScroll: true});
}

function caretIcon() {
    return h(
        'span',
        {
            className: 'xh-menu-item__submenu-icon',
            'aria-hidden': true
        },
        h(
            'svg',
            {'data-icon': 'caret-right', width: 16, height: 16, viewBox: '0 0 16 16'},
            h('path', {d: CARET_RIGHT_PATH, fillRule: 'evenodd'})
        )
    );
}
