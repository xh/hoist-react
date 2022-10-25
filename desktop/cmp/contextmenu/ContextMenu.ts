/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp, MenuItem} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {menu, menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {wait} from '@xh/hoist/promise';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {cloneDeep, isEmpty, isString} from 'lodash';
import {isValidElement, ReactElement, ReactNode} from 'react';

export interface ContextMenuProps {
    menuItems: (MenuItem|ReactNode)[]
}

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
function parseMenuItems(items: any[]): ReactNode[] {
    items = items.map(item => {
        if (isString(item) || isValidElement(item)) return item;

        item = cloneDeep(item);
        item.prepareFn?.(item);
        return item;
    });

    return items
        .filter(it => !it.hidden)
        .filter(filterConsecutiveMenuSeparators())
        .map(item => {
            if (item === '-') return menuDivider();
            if (isString(item) || isValidElement(item)) {
                return item;
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
