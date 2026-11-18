/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * SPIKE - Blueprint removal, Phase 0. Menu, MenuItem and MenuDivider standing in for Blueprint's,
 * behind the `menu` / `menuItem` / `menuDivider` factories in `kit/blueprint`.
 *
 * Renders Blueprint's DOM and class names, so existing styles apply. Submenus are built on the
 * spike `FloatingPopover`. Adds keyboard support Blueprint's menu lacks: arrow keys, Home/End,
 * typeahead, and ArrowRight/ArrowLeft to open and close submenus (WAI-ARIA menu pattern).
 */
import type {MenuDividerProps, MenuItemProps, MenuProps, PopoverProps} from '@blueprintjs/core';
import {popoverPropsToNextProps} from '@blueprintjs/core';
import classNames from 'classnames';
import {isString} from 'lodash';
import type {FC, KeyboardEvent} from 'react';
import {
    createContext,
    createElement as h,
    forwardRef,
    useContext,
    useEffect,
    useRef,
    useState
} from 'react';
import {FloatingPopover} from '../../popover/impl/FloatingPopover';

const CARET_RIGHT_PATH =
    'M11 8c0-.15-.07-.28-.17-.37l-4-3.5A.495.495 0 0 0 6 4.5v7a.495.495 0 0 0 .83.37l4-3.5c.1-.09.17-.22.17-.37';

const SUBMENU_MIDDLEWARE = {
    flip: {padding: 20, rootBoundary: 'viewport' as const},
    offset: {crossAxis: -5},
    shift: {padding: 20, rootBoundary: 'viewport' as const}
};

/** Set by a submenu for the menu it contains, so ArrowLeft can close it. */
const SubmenuContext = createContext<{close: () => void}>(null);

//------------------------
// Menu
//------------------------
export const FloatingMenu: FC<MenuProps> = props => {
    const {className, children, size = 'medium', ulRef, large, small, ...rest} = props as any,
        submenu = useContext(SubmenuContext),
        typeahead = useRef({buffer: '', timer: 0});

    const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
        rest.onKeyDown?.(e);
        const items = menuItemsOf(e.currentTarget),
            idx = items.indexOf(e.target as HTMLElement);
        if (idx < 0) return; // Event came from a nested submenu, which handles its own keys.

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

        // Typeahead - jump to the next item whose text starts with the typed characters.
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
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
            onKeyDown,
            ref: ulRef,
            className: classNames(className, 'bp6-menu', {
                'bp6-large': large || size === 'large',
                'bp6-small': small || size === 'small'
            })
        },
        children
    );
};

//------------------------
// MenuItem
//------------------------
export const FloatingMenuItem = forwardRef<HTMLLIElement, MenuItemProps>((props, ref) => {
    const {
        active = false,
        className,
        children,
        disabled = false,
        icon,
        intent,
        label,
        labelClassName,
        labelElement,
        multiline = false,
        popoverProps = {},
        roleStructure,
        selected,
        shouldDismissPopover = true,
        submenuProps,
        tagName = 'a',
        text = '',
        textClassName,
        htmlTitle,
        ...htmlProps
    } = props as any;
    void roleStructure;
    void selected;

    const hasSubmenu = children != null,
        [subOpen, setSubOpen] = useState(false),
        focusFirstOnOpen = useRef(false),
        liRef = useRef<HTMLLIElement>(null),
        subPopoverRef = useRef<HTMLDivElement>(null);

    // After a keyboard open, move focus into the submenu once it has rendered.
    useEffect(() => {
        if (!subOpen || !focusFirstOnOpen.current) return;
        focusFirstOnOpen.current = false;
        // Found via the popover ref, since a submenu may render in a portal outside this item.
        // A portaled submenu mounts a render later, so retry for a few frames.
        let tries = 0,
            frame: number;
        const tryFocus = () => {
            const sub = subPopoverRef.current?.querySelector<HTMLUListElement>('.bp6-menu'),
                first = sub ? menuItemsOf(sub)[0] : null;
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
        tagName,
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
                'bp6-menu-item',
                intent ? `bp6-intent-${intent}` : null,
                {
                    'bp6-active': active,
                    'bp6-disabled': disabled,
                    'bp6-popover-dismiss': shouldDismissPopover && !disabled && !hasSubmenu
                },
                className
            )
        },
        icon != null && !isString(icon)
            ? h('span', {className: 'bp6-menu-item-icon', 'aria-hidden': true}, icon)
            : null,
        h(
            'div',
            {
                className: classNames('bp6-fill', textClassName, {
                    'bp6-text-overflow-ellipsis': !multiline
                }),
                title: htmlTitle
            },
            text
        ),
        label != null || labelElement != null
            ? h(
                  'span',
                  {className: classNames('bp6-menu-item-label', labelClassName)},
                  label,
                  labelElement
              )
            : null,
        hasSubmenu ? caretIcon() : null
    );

    const setRefs = (el: HTMLLIElement) => {
        liRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
    };

    if (!hasSubmenu) return h('li', {ref: setRefs, role: 'none'}, anchor);

    const nextProps = popoverPropsToNextProps(popoverProps as PopoverProps);
    return h(
        'li',
        {ref: setRefs, role: 'none', className: 'bp6-submenu'},
        h(FloatingPopover, {
            autoFocus: false,
            captureDismiss: false,
            disabled,
            enforceFocus: false,
            hoverCloseDelay: 0,
            interactionKind: 'hover',
            placement: 'right-start',
            usePortal: false,
            ...nextProps,
            isOpen: subOpen,
            popoverRef: subPopoverRef,
            onInteraction: open => setSubOpen(open),
            middleware: {...SUBMENU_MIDDLEWARE, ...nextProps.middleware},
            arrow: false,
            popoverClassName: classNames('bp6-submenu', popoverProps?.popoverClassName),
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
                h(FloatingMenu, {...submenuProps}, children)
            ),
            children: anchor
        })
    );
});

//------------------------
// MenuDivider
//------------------------
export const FloatingMenuDivider: FC<MenuDividerProps> = ({className, title, titleId}) =>
    h(
        'li',
        {
            className: classNames(title ? 'bp6-menu-header' : 'bp6-menu-divider', className),
            role: 'separator'
        },
        title ? h('h6', {id: titleId, className: 'bp6-heading'}, title) : null
    );

//------------------------
// Implementation
//------------------------
/** The enabled items of a menu, excluding those of any nested submenu. */
function menuItemsOf(ul: Element): HTMLElement[] {
    return Array.from(
        ul.querySelectorAll<HTMLElement>(
            ':scope > li > [role=menuitem], :scope > li > .bp6-popover-target > [role=menuitem]'
        )
    ).filter(it => it.getAttribute('aria-disabled') !== 'true');
}

function caretIcon() {
    return h(
        'span',
        {className: 'bp6-icon bp6-icon-caret-right bp6-submenu-icon', 'aria-hidden': true},
        h(
            'svg',
            {'data-icon': 'caret-right', width: 16, height: 16, viewBox: '0 0 16 16'},
            h('path', {d: CARET_RIGHT_PATH, fillRule: 'evenodd'})
        )
    );
}
