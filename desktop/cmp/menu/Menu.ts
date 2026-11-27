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
    type TestSupportProps
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {TEST_ID} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import type {MouseEvent} from 'react';
import {menuList} from './impl/MenuImpl';
import {MENU_DEFAULTS, type MenuDefaults, parseMenuItems} from './impl/MenuItems';

export interface MenuProps extends HoistProps, TestSupportProps {
    /** Items to display. */
    menuItems: MenuItemLike[];

    /** Contextual data passed to each item's `actionFn` and `prepareFn`. */
    context?: MenuContext;
}

/**
 * Renders a menu from Hoist {@link MenuItem} configs, tokens, and {@link MenuHeading} entries. It
 * runs each `prepareFn`, drops hidden and omitted items, builds submenus, and tidies separators
 * and headings.
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
    model: false,

    render({menuItems, context, className, testId}) {
        const items = parseMenuItems(menuItems, {context});
        return isEmpty(items)
            ? null
            : menuList({
                  className,
                  children: items,
                  onContextMenu: swallowContextMenu,
                  [TEST_ID]: testId
              });
    }
});

export type {MenuDefaults};

/**
 * A right-click on a menu should not reach a context menu on the component beneath. The popover
 * renders in a portal, but React events still bubble up the tree. The browser's own menu shows only
 * for a link, so a user can open it in a new tab or window.
 * @internal
 */
export function swallowContextMenu(e: MouseEvent) {
    e.stopPropagation();
    if (!(e.target as Element).closest?.('a[href]')) e.preventDefault();
}
