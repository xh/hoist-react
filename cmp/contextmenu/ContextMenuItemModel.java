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
export class ContextMenuItemModel {

    name;
    icon;
    action;
    items;
    enableFn;
    recordsRequired;

    /**
     * Construct this object.
     * @param text, String to be displayed
     * @param icon, optional.
     * @param action, optional, function to execute on click
     * @param items, optional, child menu items.
     *
     * @param enableFn, optional, function called to determine if item should be enabled.
     * @param recordsRequired how many records must be 'active' (selected and / or clicked upon) for the menuitem to be enabled.
     *           int: specifies exactly n number of records. Defaults to 1 for single record actions.
     *               Can specify 0 to only enable menuitem if no records are active.
     *           true: specifies that number of records > 0. Allows for arbitrary number of records.
     *           false:  specifies any number of records (0 - infinity, inclusive). Always active.
     */
    constructor({
        name,
        icon = null,
        action = null,
        items = null,
        enableFn = null,
        recordsRequired = false
    }) {
        this.name = name;
        this.icon = icon;
        this.action = action;
        this.items = items;
        this.enableFn = enableFn;
        this.recordsRequired = recordsRequired
    }


}