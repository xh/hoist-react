/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

export class ContextMenuModel {

    /**
     * Array of form [{icon: , text: , fn: }, '-', {icon: , text: , fn:, items: }
     *
     * + The character '-' represents a horizontal divider.
     * + Child menu items will be stored in a "children" array.
     */
    items = [];

    constructor(items) {
        this.items = items;
    }
}