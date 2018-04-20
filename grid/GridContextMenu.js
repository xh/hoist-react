/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isString} from 'lodash';
import {GridContextMenuItem} from './GridContextMenuItem';

/**
 * Model for ContextMenu on Grid.
 *
 * To add a context menu on a grid specify the getContextMenu() method on the GridModel.
 */
export class GridContextMenu {

    items = [];

    /**
     * @param {Object[]} items - collection of GridContextMenuItems, configs to
     *          create them, or Strings.  If a String, value can be '-' for a
     *          seperator, or a key for a native AG Grid menu item.
     */
    constructor(items) {
        this.items = items.map(it => {
            if (it instanceof GridContextMenuItem || isString(it)) return it;
            return new GridContextMenuItem(it);
        });
    }
}