/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {menu, menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {wait} from '@xh/hoist/promise';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import PT from 'prop-types';
import {isValidElement} from 'react';
import {ContextMenuItem} from './ContextMenuItem';
import {isEmpty} from 'lodash';

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

    render({menuItems}) {
        menuItems = parseMenuItems(menuItems);
        return isEmpty(menuItems) ? null : menu(menuItems);
    }
});

ContextMenu.propTypes = {
    /**
     * Array of:
     *  + `ContextMenuItems` or configs to create them.
     *  + `MenuDividers` or the special string token '-'.
     *  + React Elements or strings, which will be interpreted as the `text` property for a MenuItem.
     */
    menuItems: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.element])).isRequired
};

//---------------------------
// Implementation
//---------------------------
function parseMenuItems(items) {
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
                return ['Blueprint3.MenuItem', 'Blueprint3.MenuDivider'].includes(item.type.displayName) ?
                    item :
                    menuItem({text: item});
            }

            const items = item.items ? parseMenuItems(item.items) : null;
            return menuItem({
                text: item.text,
                icon: item.icon,
                onClick: item.actionFn ? () => wait().then(item.actionFn) : null,    // do async to allow menu to close
                disabled: item.disabled,
                items
            });
        });
}
