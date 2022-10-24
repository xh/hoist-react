/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {menu, menuDivider, MenuDivider, menuItem, MenuItem} from '@xh/hoist/kit/blueprint';
import {wait} from '@xh/hoist/promise';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {isEmpty} from 'lodash';
import {isValidElement, ReactNode} from 'react';
import {ContextMenuItem} from './ContextMenuItem';

export interface ContextMenuProps {
    menuItems: ContextMenuItemLike[]
}

/**
 * The special string token '-' will be replaced with a MenuDivider.
 * ReactNodes or other strings will be interpreted as the `text` property for a MenuItem.
 */
export type ContextMenuItemLike = ContextMenuItem|
    Partial<ContextMenuItem>|
    MenuDivider|
    MenuItem|
    '-'|
    ReactNode

/**
 * ContextMenu
 *
 * Not typically used directly by applications.  To add a Context Menu to an application
 * see ContextMenuHost, or the 'contextMenu` prop on panel.
 *
 * @see StoreContextMenu to specify a context menu on store enabled components.
 * That API will receive specific information about the current selection
 */
export const [ContextMenu, contextMenu] = hoistCmp.withFactory({
    displayName: 'ContextMenu',
    memo: false, model: false, observer: false,

    render({menuItems}: ContextMenuProps) {
        menuItems = parseMenuItems(menuItems);
        return isEmpty(menuItems) ? null : menu(menuItems);
    }
});

//---------------------------
// Implementation
//---------------------------
function parseMenuItems(items: ContextMenuItemLike[]): ContextMenuItemLike[] {
    items = items.map(item => {
        if (item === '-' || isValidElement(item)) return item;

        if (!(item instanceof ContextMenuItem)) {
            item = new ContextMenuItem(item);
        }
        if (item.prepareFn) item.prepareFn(item);
        return item;
    });

    return items
        .filter(it => !it.hidden)
        .filter(filterConsecutiveMenuSeparators())
        .map(item => {
            if (item === '-') return menuDivider();
            if (isValidElement(item)) {
                if (item instanceof MenuItem || item instanceof MenuDivider) return item;
                return menuItem({text: item});
            }

            const items = item.items ? parseMenuItems(item.items) : null;
            return menuItem({
                text: item.text,
                icon: item.icon,
                intent: item.intent,
                onClick: item.actionFn ? () => wait().then(item.actionFn) : null,    // do async to allow menu to close
                disabled: item.disabled,
                items
            });
        });
}
