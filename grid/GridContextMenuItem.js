/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 *  Basic Model Object for ContextMenus.
 *  
 *  Note that some items may only make sense for menus appearing over a Grid. (e.g. recordsRequired).
 *  Also the form of callbacks may also change slightly, depending on whether or not the menu is being
 *  triggered over a grid.
 */
export class GridContextMenuItem {

    text;
    icon;
    action;
    items;
    enableFn;
    hideFn;
    prepareFn;
    recordsRequired;

    /**
     * Construct this object.
     * @param text, String to be displayed
     * @param icon, optional.
     * @param items, optional, child menu items.
     *
     * @param action, optional, function(item, record, selection).
     *
     *          Executed when the user clicks the menuitem.
     *          It is passed the menuitem, clicked grid record, and current grid selection.
     *
     * @param enableFn, optional, function(item, record, selection).
     *
     *          The enableFn is a callback that is triggered before each time the menuitem is shown.
     *          It should return a boolean for whether or not to enable the menuitem.
     *
     * @param hideFn, optional, function(item, record, selection).
     *
     *          The hideFn is a callback that is triggered before each time the menuitem is shown.
     *          It should return a boolean for whether or not to hide the menuitem.
     *
     * @param prepareFn, optional, function(item, record, selection).
     *
     *          The prepareFn is a callback that is triggered before each time the menuitem is shown.
     *          It can be used to modify the menuitem based on the record / selection.
     *
     * @param recordsRequired how many records must be 'active' (selected and / or clicked upon) for the menuitem to be enabled.
     *
     *          int: specifies exactly n number of records. Defaults to 1 for single record actions.
     *               Can specify 0 to only enable menuitem if no records are active.
     *          true: specifies that number of records > 0. Allows for arbitrary number of records.
     *          false:  specifies any number of records (0 - infinity, inclusive). Always active.
     */
    constructor({
        text,
        icon = null,
        action = null,
        items = null,
        enableFn = null,
        hideFn = null,
        prepareFn = null,
        recordsRequired = false
    }) {
        this.text = text;
        this.icon = icon;
        this.action = action;
        this.items = items;
        this.enableFn = enableFn;
        this.hideFn = hideFn;
        this.prepareFn = prepareFn;
        this.recordsRequired = recordsRequired;
    }
}