/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isString} from 'lodash';
import {StoreContextMenuItem} from './StoreContextMenuItem';

/**
 * Model for ContextMenu on stores.
 */
export class StoreContextMenu {

    items = [];

    /**
     * @param {Object[]} items - collection of StoreContextMenuItems, configs to create them, or Strings.
     *      If a String, value can be '-' for a separator, or a key for a native AG Grid menu item.
     */
    constructor(items) {
        this.items = items.map(it => {
            if (it instanceof StoreContextMenuItem || isString(it)) return it;
            return new StoreContextMenuItem(it);
        });
    }
}