/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    hoistCmp,
    type HoistProps,
    type MenuContext,
    type MenuItemLike,
    type Thunkable
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {menu as bpMenu} from '@xh/hoist/kit/blueprint';
import {isEmpty, isFunction} from 'lodash';
import {useState} from 'react';
import {MENU_DEFAULTS, type MenuDefaults, parseMenuItems} from './impl/MenuItems';

export interface MenuProps extends HoistProps {
    /** Items to display, or a function producing them when the menu mounts. */
    menuItems: Thunkable<MenuItemLike[]>;

    /**
     * Contextual data passed to each item's `actionFn` and `prepareFn`, or a function producing
     * it when the menu mounts.
     */
    context?: Thunkable<MenuContext>;
}

/**
 * Renders a menu from Hoist {@link MenuItem} configs, tokens, and {@link MenuHeading} entries. It
 * runs each `prepareFn`, drops hidden and omitted items, builds submenus, and tidies separators
 * and headings. `menuItems` and `context` given as functions are evaluated once, when the menu
 * mounts, and not again on re-render. Within a popover, that is each time it opens.
 *
 * For the common case of a menu on a trigger button, use {@link MenuButton}. For a right-click
 * menu, use {@link useContextMenu} or Panel's {@link PanelProps.contextMenu}.
 *
 * This component accepts only the base `'-'` separator token. `Grid` and `Chart` carry richer
 * token vocabularies, which they resolve through their own menu APIs.
 */
export const [Menu, menu] = hoistCmp.withFactory<MenuProps, MenuDefaults>({
    displayName: 'Menu',
    className: 'xh-menu',
    defaults: MENU_DEFAULTS,
    memo: false,
    model: false,
    observer: false,

    render({menuItems, context, className}) {
        // Function forms resolve once per mount.
        const [mounted] = useState(() => ({
                menuItems: isFunction(menuItems) ? menuItems() : null,
                context: isFunction(context) ? context() : null
            })),
            items = parseMenuItems(isFunction(menuItems) ? mounted.menuItems : menuItems, {
                context: isFunction(context) ? mounted.context : context
            });
        return isEmpty(items) ? null : bpMenu({className, items});
    }
});

export type {MenuDefaults};
