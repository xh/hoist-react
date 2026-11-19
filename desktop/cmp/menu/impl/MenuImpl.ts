/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PopoverProps} from '@xh/hoist/cmp/popover';
import {PopoverImpl} from '@xh/hoist/cmp/popover/impl/PopoverImpl';
import type {Intent} from '@xh/hoist/core';
import {elementFactory} from '@xh/hoist/core';
import classNames from 'classnames';
import type {AnchorHTMLAttributes, FC, HTMLAttributes, KeyboardEvent, ReactNode, Ref} from 'react';
import {createContext, createElement as h, useContext, useEffect, useRef, useState} from 'react';

/** A list of menu items, as rendered within a popover or a context menu. */
export interface MenuListProps extends HTMLAttributes<HTMLUListElement> {
    ulRef?: Ref<HTMLUListElement>;
}

/** A single item within a menu, optionally holding a submenu of further items as `children`. */
export interface MenuItemImplProps extends Omit<AnchorHTMLAttributes<HTMLElement>, 'children'> {
    text?: ReactNode;
    icon?: ReactNode;
    intent?: Intent;
    active?: boolean;
    disabled?: boolean;
    /** Element shown at the right edge of the item, e.g. a keyboard shortcut. */
    labelElement?: ReactNode;
    /** True to wrap long text rather than truncate it. */
    multiline?: boolean;
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
export interface MenuDividerImplProps {
    className?: string;
    title?: ReactNode;
}

const CARET_RIGHT_PATH =
    'M11 8c0-.15-.07-.28-.17-.37l-4-3.5A.495.495 0 0 0 6 4.5v7a.495.495 0 0 0 .83.37l4-3.5c.1-.09.17-.22.17-.37';

/** Set by a submenu for the menu list it holds, so ArrowLeft can close it. */
const SubmenuContext = createContext<{close: () => void}>(null);

//------------------------
// Menu list
//------------------------
const MenuList: FC<MenuListProps> = ({className, children, ulRef, onKeyDown, ...rest}) => {
    const submenu = useContext(SubmenuContext),
        typeahead = useRef({buffer: '', timer: 0});

    const handleKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
        onKeyDown?.(e);
        const items = menuItemsOf(e.currentTarget),
            idx = items.indexOf(e.target as HTMLElement);
        if (idx < 0) return; // From a nested submenu, which handles its own keys.

        const focusAt = (i: number) => {
            e.preventDefault();
            e.stopPropagation();
            items[(i + items.length) % items.length]?.focus();
        };

        switch (e.key) {
            case 'ArrowDown':
                return focusAt(idx + 1);
            case 'ArrowUp':
                return focusAt(idx - 1);
            case 'Home':
                return focusAt(0);
            case 'End':
                return focusAt(items.length - 1);
            case 'ArrowLeft':
                if (submenu) {
                    e.preventDefault();
                    e.stopPropagation();
                    submenu.close();
                }
                return;
        }

        // Typeahead - move to the next item whose text starts with the characters typed.
        if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const t = typeahead.current;
            window.clearTimeout(t.timer);
            t.buffer += e.key.toLowerCase();
            t.timer = window.setTimeout(() => (t.buffer = ''), 500);
            const start = t.buffer.length === 1 ? idx + 1 : idx,
                ordered = [...items.slice(start), ...items.slice(0, start)],
                match = ordered.find(it =>
                    it.textContent.trim().toLowerCase().startsWith(t.buffer)
                );
            if (match) focusAt(items.indexOf(match));
        }
    };

    return h(
        'ul',
        {
            role: 'menu',
            ...rest,
            ref: ulRef,
            onKeyDown: handleKeyDown,
            className: classNames(className, 'xh-menu-list', 'bp6-menu')
        },
        children
    );
};

//------------------------
// Menu item
//------------------------
const MenuItem: FC<MenuItemImplProps> = props => {
    const {
        active = false,
        children,
        className,
        disabled = false,
        icon,
        intent,
        labelElement,
        multiline = false,
        popoverProps,
        shouldDismissPopover = true,
        text,
        ...htmlProps
    } = props;

    const hasSubmenu = children != null,
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
        if (disabled) return;
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
                'bp6-menu-item',
                intent ? [`xh-menu-item--intent-${intent}`, `bp6-intent-${intent}`] : null,
                {
                    'xh-menu-item--active bp6-active': active,
                    'xh-menu-item--disabled bp6-disabled': disabled,
                    'xh-popover-dismiss bp6-popover-dismiss':
                        shouldDismissPopover && !disabled && !hasSubmenu
                },
                className
            )
        },
        icon != null
            ? h(
                  'span',
                  {className: 'xh-menu-item__icon bp6-menu-item-icon', 'aria-hidden': true},
                  icon
              )
            : null,
        h(
            'div',
            {
                className: classNames('xh-menu-item__text', 'bp6-fill', {
                    'bp6-text-overflow-ellipsis': !multiline
                })
            },
            text
        ),
        labelElement != null
            ? h('span', {className: 'xh-menu-item__label bp6-menu-item-label'}, labelElement)
            : null,
        hasSubmenu ? caretIcon() : null
    );

    if (!hasSubmenu) return h('li', {ref: liRef, role: 'none'}, anchor);

    return h(
        'li',
        {ref: liRef, role: 'none', className: 'xh-menu-item--submenu bp6-submenu'},
        h(PopoverImpl, {
            interactionKind: 'hover',
            position: 'right-top',
            minimal: true,
            autoFocus: false,
            usePortal: false,
            hoverCloseDelay: 0,
            ...popoverProps,
            disabled,
            isOpen: subOpen,
            onInteraction: open => setSubOpen(open),
            popoverRef: subPopoverRef,
            // Shift up so the submenu's first item lines up with this one.
            offset: {crossAxis: -5},
            popoverClassName: classNames(
                'xh-menu__submenu',
                'bp6-submenu',
                popoverProps?.popoverClassName
            ),
            content: h(
                SubmenuContext.Provider,
                {
                    value: {
                        close: () => {
                            setSubOpen(false);
                            liRef.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
                        }
                    }
                },
                h(MenuList, null, children)
            ),
            children: anchor
        })
    );
};

//------------------------
// Divider
//------------------------
const MenuDivider: FC<MenuDividerImplProps> = ({className, title}) =>
    h(
        'li',
        {
            role: 'separator',
            className: classNames(
                title ? 'xh-menu-header bp6-menu-header' : 'xh-menu-divider bp6-menu-divider',
                className
            )
        },
        title ? h('h6', {className: 'bp6-heading'}, title) : null
    );

//------------------------
// Factories
//------------------------
export const menuList = elementFactory(MenuList),
    menuItem = elementFactory(MenuItem),
    menuDivider = elementFactory(MenuDivider);

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

function caretIcon() {
    return h(
        'span',
        {
            className: 'xh-menu-item__submenu-icon bp6-icon bp6-icon-caret-right bp6-submenu-icon',
            'aria-hidden': true
        },
        h(
            'svg',
            {'data-icon': 'caret-right', width: 16, height: 16, viewBox: '0 0 16 16'},
            h('path', {d: CARET_RIGHT_PATH, fillRule: 'evenodd'})
        )
    );
}
