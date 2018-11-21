/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 *  Basic Model Object for MenuItem.
 */
export class MenuItemModel {

    text;
    icon;
    action;
    disabled;
    hidden;
    prepareFn;
    element;

    /**
     * @param {Object} c - MenuItemModel configuration.
     * @param {string} c.text - label to be displayed.
     * @param {Object} [c.icon] - optional icon to be displayed.
     * @param {function} [c.action] - Executed when the user clicks the menuitem.
     * @param {boolean} [c.disabled] - true to disable this item.
     * @param {boolean} [c.hidden] - true to hide this item.
     * @param {function} [c.prepareFn] - function of the form (item) => {}
     *      The prepareFn is a callback that is triggered before each time the menuitem is shown.
     *      It can be used to modify the menuitem based on the record / selection.
     */
    constructor({
        text,
        icon = null,
        action = null,
        disabled = false,
        hidden = false,
        prepareFn = null,
        element = null
    }) {
        this.text = text;
        this.icon = icon;
        this.action = action;
        this.disabled = disabled;
        this.hidden = hidden;
        this.prepareFn = prepareFn;
        this.element = element;
    }
}