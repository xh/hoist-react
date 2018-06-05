/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isString} from 'lodash';
import {StoreContextMenuItem} from './StoreContextMenuItem';
import {Icon} from '@xh/hoist/icon';

/**
 * Model for ContextMenu on stores.
 */
export class StoreContextMenu {

    items = [];
    parent = null;

    /**
     * @param {Object[]} items - collection of StoreContextMenuItems, configs to create them, or Strings.
     *      If a String, value can be '-' for a separator, a known token, or a key or a native AG Grid menu item.
     * @param {Object} parent - a gridModel to bind to this contextMenu
     */
    constructor(items, parent) {
        this.parent = parent;
        this.items = items.map(it => {
            if (isString(it)) return this.parseToken(it);
            if (it instanceof StoreContextMenuItem) return it;
            return new StoreContextMenuItem(it);
        });
    }

    parseToken(token) {
        switch (token) {
            case 'colChooser':
                return new StoreContextMenuItem({
                    text: 'Columns...',
                    icon: Icon.grid(),
                    hidden: !this.parent.colChooserModel,
                    action: () => {
                        this.parent.colChooserModel.open();
                    }
                });
            default:
                return token;
        }
    }
}