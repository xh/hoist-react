/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 *  Basic Model Object for ContextMenus.
 */
export class ContextMenuItem {

    text;
    icon;
    action;
    disabled;
    items;

    /**
     * Construct this object.
     * @param text, String to be displayed
     * @param icon, optional.
     * @param action, optional, function to execute on click ,
     * @param disabled, optional, true to disable this item,
     * @param items, optional, child menu items.
     */
    constructor({
        text,
        icon = null,
        action = null,
        disabled = false,
        items = null,
    }) {
        this.text = text;
        this.icon = icon;
        this.action = action;
        this.disabled = disabled
        this.items = items;
    }
}