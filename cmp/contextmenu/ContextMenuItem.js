/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 *  Basic Model Object for ContextMenu.
 */
export class ContextMenuItem {

    text;
    icon;
    action;
    items;
    disabled;
    hidden;
    prepareFn;

    /**
     * @param {string} text - label to be displayed.
     * @param {Object} [icon=null] - optional icon to be displayed.
     * @param {function} [action=null] - Executed when the user clicks the menuitem.
     * @param {Object[]} [items=null] - child menu items.
     * @param {boolean} [disabled=false] - true to disable this item.
     * @param {boolean} [hidden=false] - true to hide this item.
     * @param {function} [prepareFn=null] - function of the form (item, record, selection) => {}
     *          The prepareFn is a callback that is triggered before each time the menuitem is shown.
     *          It can be used to modify the menuitem based on the record / selection.
     */
    constructor({
        text,
        icon = null,
        action = null,
        items = null,
        disabled = false,
        hidden = false,
        prepareFn = null
    }) {
        this.text = text;
        this.icon = icon;
        this.action = action;
        this.items = items;
        this.disabled = disabled;
        this.hidden = hidden;
        this.prepareFn = prepareFn;
    }
}