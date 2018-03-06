/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 * Model for ContextMenu on Grids.
 *
 * To add a context menu on a grid specify a getContextMenu() method on the GridModel.
 */
export class GridContextMenu {

    items = [];

    /**
     * Construct this object.
     *
     * @param items, Array of GridContextMenuItems, configs to create them, or Strings.
     *        If a String, value can be '-' for a seperator, or a key for a native AG Grid menu items.
     */
    constructor(items) {
        this.items = items.map(it => {
            if (it instanceof GridContextMenuItem || isString(it)) return it;
            return new GridContextMenuItem(it);
        });
    }
}