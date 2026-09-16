/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ElementSpec, isMenuHeading, isMenuItem, MenuContext, MenuItemLike} from '@xh/hoist/core';
import {menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {MenuItemProps} from '@blueprintjs/core';
import {wait} from '@xh/hoist/promise';
import {
    filterConsecutiveMenuSeparators,
    filterMenuHeadings,
    isVisibleMenuEntry,
    resolveMenuHeading
} from '@xh/hoist/utils/impl';
import {clone, isEmpty} from 'lodash';
import {ReactNode} from 'react';

/**
 * Popover defaults for every Hoist submenu.
 *
 * Blueprint's `MenuItem` hardcodes `hoverCloseDelay: 0`, so a submenu closes the moment the
 * pointer leaves the parent item's row. That makes a diagonal move toward an entry lower in the
 * submenu dismiss it, which is the standard failure of hover-driven submenus. Blueprint's own
 * `Popover` default is 300ms, and caller props win over the `MenuItem` value, so Hoist restores it.
 *
 * @internal
 */
export const SUBMENU_POPOVER_DEFAULTS: MenuItemProps['popoverProps'] = {
    hoverCloseDelay: 300,
    openOnTargetFocus: false
};

export interface ParseMenuItemsOptions {
    /** Contextual data passed to each item's `prepareFn` and `actionFn`. */
    context?: MenuContext;

    /**
     * Props for the popover that hosts a submenu, merged over {@link SUBMENU_POPOVER_DEFAULTS}.
     * A menu anchored at the cursor adds `{usePortal: true}`, because its submenus mis-position
     * without a portal.
     */
    submenuPopoverProps?: MenuItemProps['popoverProps'];
}

/**
 * Parse MenuItem configs into Blueprint MenuItems.
 *
 * The {@link Menu} and {@link ContextMenu} components share this function. Note that Hoist does
 * not apply it to every menu-like component. In particular, the `menu` component re-exported from
 * Blueprint does not use it. See https://github.com/xh/hoist-react/issues/2400 for the remaining
 * standardization work.
 *
 * @internal
 */
export function parseMenuItems(
    items: MenuItemLike[],
    opts: ParseMenuItemsOptions = {}
): ReactNode[] {
    const {context, submenuPopoverProps} = opts;
    const popoverProps = {...SUBMENU_POPOVER_DEFAULTS, ...submenuPopoverProps};

    items = items.map(item => {
        if (isMenuHeading(item)) return resolveMenuHeading(item, context);
        if (!isMenuItem(item)) return item;

        item = clone(item);
        item.items = clone(item.items);
        item.prepareFn?.(item, context);
        return item;
    });

    return items
        .filter(isVisibleMenuEntry)
        .filter(filterMenuHeadings(isMenuHeading))
        .filter(filterConsecutiveMenuSeparators())
        .map(item => {
            // Process dividers and headings
            if (item === '-') return menuDivider();
            if (isMenuHeading(item)) {
                return menuDivider({title: item.heading, className: item.className});
            }
            if (!isMenuItem(item)) return item;

            const {actionFn} = item;

            // Create menuItem from config
            const cfg: ElementSpec<MenuItemProps> = {
                text: item.text,
                icon: item.icon,
                intent: item.intent,
                className: item.className,
                onClick: actionFn ? e => wait().then(() => actionFn(e, context)) : null, // do async to allow menu to close
                disabled: item.disabled,
                active: item.active
            };

            // Recursively parse any submenus
            if (!isEmpty(item.items)) {
                cfg.items = parseMenuItems(item.items, opts);
                cfg.popoverProps = popoverProps;
            }

            return menuItem(cfg);
        });
}
