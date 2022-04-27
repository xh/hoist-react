/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {parseMenuItems} from '@xh/hoist/desktop/cmp/contextmenu/impl/ParseMenuItems';
import {menu} from '@xh/hoist/kit/blueprint';
import PT from 'prop-types';
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