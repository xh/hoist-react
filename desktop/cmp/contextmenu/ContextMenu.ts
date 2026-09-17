/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, type HoistProps, type MenuContext, type MenuItemLike} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {parseMenuItems} from '@xh/hoist/desktop/cmp/menu/impl/MenuItems';
import {menu as bpMenu} from '@xh/hoist/kit/blueprint';
import {isEmpty} from 'lodash';

export interface ContextMenuProps extends HoistProps {
    menuItems: MenuItemLike[];
    context?: MenuContext;
}

/**
 * Component for a right-click context menu. Not typically used directly by applications - use
 * the {@link useContextMenu} hook to add a context menu to an app component, or leverage Panel's
 * built-in support via {@link PanelProps.contextMenu}. For a menu on a button, see
 * {@link MenuButton}.
 *
 * See {@link GridContextMenuSpec} to specify a context menu on `Grid` and `DataView` components.
 * That API will receive specific information about the current selection
 */
export const [ContextMenu, contextMenu] = hoistCmp.withFactory<ContextMenuProps>({
    displayName: 'ContextMenu',
    memo: false,
    model: false,
    observer: false,

    render({menuItems, context}) {
        // Anchored at the cursor rather than a target element, where submenus mis-position
        // without a portal - see hoist-react #3724.
        const items = parseMenuItems(menuItems, {
            context,
            submenuPopoverProps: {usePortal: true}
        });
        return isEmpty(items)
            ? null
            : bpMenu({
                  items,
                  // The menu renders in its own React root, outside the `useContextMenu` target
                  // that would otherwise swallow a right-click. Keep the browser menu off it.
                  onContextMenu: e => e.preventDefault()
              });
    }
});
