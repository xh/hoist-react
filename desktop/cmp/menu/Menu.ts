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
    /** Items to display, or a function producing them when the menu is shown. */
    menuItems: Thunkable<MenuItemLike[]>;

    /**
     * Contextual data passed to each item's `actionFn` and `prepareFn`, or a function producing
     * it when the menu is shown.
     */
    context?: Thunkable<MenuContext>;
}

/**
 * Renders a menu from Hoist {@link MenuItem} configs, tokens, and {@link MenuHeading} entries. It
 * runs each `prepareFn`, drops hidden and omitted items, builds submenus, and tidies separators
 * and headings. `menuItems` and `context` given as functions are evaluated once each time the
 * menu is shown - i.e. on mount - and not again should the menu re-render while open.
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
        // Function forms resolve once per mount. A popover mounts its content on open, so this is
        // once per showing. Plain values pass through, leaving them under the parent's control.
        const [shown] = useState(() => ({
                menuItems: isFunction(menuItems) ? menuItems() : null,
                context: isFunction(context) ? context() : null
            })),
            items = parseMenuItems(isFunction(menuItems) ? shown.menuItems : menuItems, {
                context: isFunction(context) ? shown.context : context
            });
        return isEmpty(items) ? null : bpMenu({className, items});
    }
});

export type {MenuDefaults};
