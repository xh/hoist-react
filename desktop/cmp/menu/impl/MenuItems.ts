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

export interface ParseMenuItemsOptions {
    /** Contextual data passed to each item's `prepareFn` and `actionFn`. */
    context?: MenuContext;

    /**
     * Props for the popover that hosts a submenu. Defaults to `{openOnTargetFocus: false}`, which
     * suits a menu anchored to a button. A menu anchored at the cursor passes `{usePortal: true}`
     * instead, because its submenus mis-position without a portal.
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
    const {context, submenuPopoverProps = {openOnTargetFocus: false}} = opts;

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
                cfg.popoverProps = submenuPopoverProps;
            }

            return menuItem(cfg);
        });
}
