/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, type HoistProps, type MenuContext, type MenuItemLike} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {menu as bpMenu} from '@xh/hoist/kit/blueprint';
import {isEmpty} from 'lodash';
import {MENU_DEFAULTS, type MenuDefaults, parseMenuItems} from './impl/MenuItems';

export interface MenuProps extends HoistProps {
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
    memo: false,
    model: false,
    observer: false,

    render({menuItems, context, className}) {
        const items = parseMenuItems(menuItems, {context});
        return isEmpty(items) ? null : bpMenu({className, items});
    }
});

export type {MenuDefaults};
