/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {assign} from 'lodash';

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
     * @param {Object} [icon] - optional icon to be displayed.
     * @param {function} [action] - Executed when the user clicks the menuitem.
     * @param {Object[]} [items] - child menu items.
     * @param {boolean} [disabled] - true to disable this item.
     * @param {boolean} [hidden] - true to hide this item.
     * @param {function} [prepareFn] - function of the form (item, record, selection) => {}
     *      The prepareFn is a callback that is triggered before each time the menuitem is shown.
     *      It can be used to modify the menuitem based on the record / selection.
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

    /**
     * Standard Framework Menu Items
     */
    static reloadApp(defs) {
        return assign({
            text: 'Reload App',
            icon: Icon.refresh(),
            action: () => XH.reloadApp()
        }, defs);
    }

    static about(defs) {
        return assign({
            text: 'About',
            icon: Icon.info(),
            action: () => XH.showAboutDialog()
        }, defs);
    }

    static logout(defs) {
        return assign({
            text: 'Logout',
            icon: Icon.logout(),
            hidden: !XH.app.enableLogout,
            action: () => XH.identityService.logoutAsync()
        }, defs);
    }
}
