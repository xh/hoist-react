import {isMenuItem, MenuItemLike} from '@xh/hoist/core';
import {menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {MenuItemProps} from '@blueprintjs/core';
import {wait} from '@xh/hoist/promise';
import {isOmitted} from '@xh/hoist/utils/impl/IsOmitted';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl/Separators';
import {clone, isEmpty} from 'lodash';
import {ReactNode} from 'react';

/**
 * Parse MenuItem configs into Blueprint MenuItems.
 * @internal
 */
export function parseMenuItems(items: MenuItemLike[]): ReactNode[] {
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
            if (item === '-') return menuDivider();
            if (!isMenuItem(item)) return item;

            const {actionFn} = item;

            // Create menuItem from config
            const cfg: MenuItemProps = {
                text: item.text,
                icon: item.icon,
                intent: item.intent,
                className: item.className,
                onClick: actionFn ? e => wait().then(() => actionFn(e)) : null, // do async to allow menu to close
                disabled: item.disabled
            };

            // Recursively parse any submenus
            if (!isEmpty(item.items)) {
                cfg.children = parseMenuItems(item.items);
                cfg.popoverProps = {openOnTargetFocus: false};
            }

            return menuItem(cfg);
        });
}
