/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistProps, MenuItem, MenuItemLike} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {menu, menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {wait} from '@xh/hoist/promise';
import {filterConsecutiveMenuSeparators, isOmitted} from '@xh/hoist/utils/impl';
import {clone, isEmpty, isString} from 'lodash';
import {isValidElement, ReactElement, ReactNode} from 'react';

/**
 * A context menu is specified as an array of items, a function to generate one from a click, or
 * a full element representing a contextMenu Component.
 */
export type ContextMenuSpec = MenuItemLike[] | ((e: MouseEvent) => MenuItemLike[]) | ReactElement;

export interface ContextMenuProps extends HoistProps {
    menuItems: MenuItemLike[];
}

/**
 * Component for a right-click context menu. Not typically used directly by applications - use
 * the {@link useContextMenu} hook to add a context menu to an app component, or leverage Panel's
 * built-in support via {@link PanelProps.contextMenu}.
 *
 * See {@link GridContextMenuSpec} to specify a context menu on `Grid` and `DataView` components.
 * That API will receive specific information about the current selection
 */
export const [ContextMenu, contextMenu] = hoistCmp.withFactory<ContextMenuProps>({
    displayName: 'ContextMenu',
    memo: false,
    model: false,
    observer: false,

    render({menuItems}) {
        const items = parseItems(menuItems);
        return isEmpty(items) ? null : menu(items);
    }
});

//---------------------------
// Implementation
//---------------------------
function parseItems(items: MenuItemLike[]): ReactNode[] {
    items = items.map(item => {
        if (!isMenuItem(item)) return item;

        item = clone(item);
        item.items = clone(item.items);
        item.prepareFn?.(item);
        return item;
    });

    return items
        .filter(it => !isMenuItem(it) || (!it.hidden && !isOmitted(it)))
        .filter(filterConsecutiveMenuSeparators())
        .map(item => {
            // Process dividers
            if (item === '-') return menuDivider();
            if (!isMenuItem(item)) return item;

            // Process items
            const items = item.items ? parseItems(item.items) : null;
            return menuItem({
                text: item.text,
                icon: item.icon,
                intent: item.intent,
                className: item.className,
                onClick: item.actionFn ? () => wait().then(item.actionFn) : null, // do async to allow menu to close
                popoverProps: {usePortal: true},
                disabled: item.disabled,
                items
            });
        });
}

function isMenuItem(item: MenuItemLike): item is MenuItem {
    return !isString(item) && !isValidElement(item);
}
