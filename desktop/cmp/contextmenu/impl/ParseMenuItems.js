import {ContextMenuItem} from '@xh/hoist/desktop/cmp/contextmenu';
import {menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {wait} from '@xh/hoist/promise';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {isValidElement} from 'react';

/** @private */
export function parseMenuItems(items) {
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
                intent: item.intent,
                onClick: item.actionFn ? () => wait().then(item.actionFn) : null,    // do async to allow menu to close
                disabled: item.disabled,
                items
            });
        });
}