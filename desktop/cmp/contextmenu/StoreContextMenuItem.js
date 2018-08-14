/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

export class StoreContextMenuItem {

    text;
    icon;
    action;
    items;
    disabled;
    hidden;
    prepareFn;
    recordsRequired;

    /**
     * @param {Object} c - StoreContextMenuItem configuration.
     * @param {string} c.text - label to be displayed.
     * @param {Object} [c.icon] - icon to be displayed.
     * @param {Object[]} [c.items] - child menu items.
     * @param {ActionCb} [c.action] - called on store context menu item click.
     * @param {boolean} [c.disabled] - true to disable this item.
     * @param {boolean} [c.hidden] - true to hide this item.
     * @param {PrepareFnCb} [c.prepareFn] - called prior to context menu item show,
     *      available to modify the item based on current record / selection at time of show.
     * @param {(number|boolean)} [c.recordsRequired] - how many records must be 'active'
     *      (selected and / or clicked upon) for the menuitem to be enabled.
     *      int: specifies exactly n number of records. Defaults to 1 for single record actions.
     *          Can specify 0 to only enable menuitem if no records are active.
     *      true: specifies that number of records > 0. Allows for arbitrary number of records.
     *      false: specifies any number of records (0 - infinity, inclusive). Always active.
     */
    constructor({
        text,
        icon = null,
        action = null,
        items = null,
        disabled = false,
        hidden = false,
        prepareFn = null,
        recordsRequired = false
    }) {
        this.text = text;
        this.icon = icon;
        this.action = action;
        this.items = items;
        this.disabled = disabled;
        this.hidden = hidden;
        this.prepareFn = prepareFn;
        this.recordsRequired = recordsRequired;
    }
}

/**
 * @callback ActionCb - called on store context menu item click.
 * @param {ContextMenuItem} item - the menu item itself.
 * @param {Object} [record] - row data object (entire row, if any).
 * @param {Object[]} [selection] - all currently selected records (if any).
 */

/**
 * @callback PrepareFnCb - called prior to store context menu item show, available to modify the
 *      item based on current record / selection at time of show.
 * @param {ContextMenuItem} item - the menu item itself.
 * @param {Object} [record] - row data object (entire row, if any).
 * @param {Object[]} [selection] - all currently selected records (if any).
 */
