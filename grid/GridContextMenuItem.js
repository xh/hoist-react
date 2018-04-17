/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 *  Basic Model Object for ContextMenu for Grid.
 */
export class GridContextMenuItem {

    text;
    icon;
    action;
    items;
    disabled;
    hidden;
    prepareFn;
    recordsRequired;

    /**
     * @param {string} text - label to be displayed.
     * @param {Object} icon - optional icon to be displayed.
     * @param {Object[]} items - child menu items.
     * @param {function} action - function of the form (item, record, selection) => {}
     *          Executed when the user clicks the menuitem.
     * @param {boolean} disabled - true to disable this item.
     * @param {boolean} hidden - true to hide this item.
     * @param {function} prepareFn - function of the form (item, record, selection) => {}
     *          The prepareFn is a callback that is triggered before each time the menuitem is shown.
     *          It can be used to modify the menuitem based on the record / selection.
     * @param {(number|boolean)} recordsRequired - how many records must be 'active'
     *          (selected and / or clicked upon) for the menuitem to be enabled.
     *              int: specifies exactly n number of records. Defaults to 1 for single record actions.
     *                  Can specify 0 to only enable menuitem if no records are active.
     *              true: specifies that number of records > 0. Allows for arbitrary number of records.
     *              false:  specifies any number of records (0 - infinity, inclusive). Always active.
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