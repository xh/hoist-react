/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
/**
 * Basic Model for an item displayed within a Menu
 */
export class MenuItem {

    text;
    icon;
    actionFn;
    disabled;
    hidden;
    prepareFn;
    displayFn;

    /**
     * @param {Object} c - MenuItem configuration.
     * @param {string} c.text - label to be displayed.
     * @param {Element} [c.icon] - optional icon to be displayed.
     * @param {function} [c.actionFn] - Executed when the user taps the menuitem.
     * @param {boolean} [c.disabled] - true to disable this item.
     * @param {boolean} [c.hidden] - true to hide this item.
     * @param {function} [c.prepareFn] - function of the form (item) => {}
     *      The prepareFn is a callback that is triggered before each time the menuitem is shown.
     *      It can be used to modify the menuitem based on the record / selection.
     * @param {DisplayFn} [c.displayFn] - called prior to showing this item in the UI.
     */
    constructor({
        text,
        icon = null,
        actionFn = null,
        disabled = false,
        hidden = false,
        prepareFn = null,
        displayFn = null
    }) {
        this.text = text;
        this.icon = icon;
        this.actionFn = actionFn;
        this.disabled = disabled;
        this.hidden = hidden;
        this.prepareFn = prepareFn;
        this.displayFn = displayFn;
    }
}

/**
 * @callback DisplayFn - called prior to rendering the MenuItem's UI element.
 * @returns {Object} - display configs to override for this render of the item.
 */