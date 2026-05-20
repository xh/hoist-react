/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ElementSpec, isMenuItem, MenuItemLike} from '@xh/hoist/core';
import {menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {MenuItemProps} from '@blueprintjs/core';
import {wait} from '@xh/hoist/promise';
import {isOmitted} from '@xh/hoist/utils/impl/IsOmitted';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl/Separators';
import {clone, isEmpty} from 'lodash';
import {ReactNode} from 'react';

/**
 * Parse MenuItem configs into Blueprint MenuItems.
 *
 * Note this is currently used in a few limited places and is not generally applied to all menu-
 * like components in Hoist. In particular, it is not used by the `menu` component re-exported from
 * Blueprint. See https://github.com/xh/hoist-react/issues/2400 covering TBD work to more fully
 * standardize a Hoist menu component that might then incorporate this processing.
 *
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
            const cfg: ElementSpec<MenuItemProps> = {
                text: item.text,
                icon: item.icon,
                intent: item.intent,
                className: item.className,
                onClick: actionFn ? e => wait().then(() => actionFn(e)) : null, // do async to allow menu to close
                disabled: item.disabled
            };

            // Recursively parse any submenus
            if (!isEmpty(item.items)) {
                cfg.items = parseMenuItems(item.items);
                cfg.popoverProps = {openOnTargetFocus: false};
            }

            return menuItem(cfg);
        });
}
