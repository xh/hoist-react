/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistProps, MenuContext, MenuItemLike} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {menu as bpMenu} from '@xh/hoist/kit/blueprint';
import {isEmpty} from 'lodash';
import {parseMenuItems} from './impl/MenuItems';

export interface MenuProps extends HoistProps {
    /** Items to display. */
    menuItems: MenuItemLike[];

    /** Contextual data passed to each item's `actionFn` and `prepareFn`. */
    context?: MenuContext;
}

/**
 * Renders a menu from Hoist {@link MenuItem} configs, tokens, and {@link MenuHeading} entries,
 * handling dynamic `prepareFn` preparation, hidden and omitted items, submenus, and the tidying
 * of separators and headings.
 *
 * Typically used as the content of a popover to build a menu button, as Hoist has no dedicated
 * desktop menu button component. Apps that need a right-click menu should reach for
 * {@link useContextMenu} or Panel's {@link PanelProps.contextMenu} instead of wiring this up
 * themselves.
 *
 * Note this component accepts only the base `'-'` separator token. Components with richer token
 * vocabularies - `Grid` and `Chart` - resolve those through their own menu APIs.
 */
export const [Menu, menu] = hoistCmp.withFactory<MenuProps>({
    displayName: 'Menu',
    className: 'xh-menu',
    memo: false,
    model: false,
    observer: false,

    render({menuItems, context, className}) {
        const items = parseMenuItems(menuItems, {context});
        return isEmpty(items) ? null : bpMenu({className, items});
    }
});
