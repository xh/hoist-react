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
 *  Basic Model for an item displayed within a generic ContextMenu.
 *  @see RecordAction for a more specific (and common) implementation tied to data views.
 */
export class ContextMenuItem {

    text;
    icon;
    actionFn;
    items;
    disabled;
    hidden;

    /**
     * @param {Object} c - ContextMenuItem configuration.
     * @param {string} c.text - label to be displayed.
     * @param {Object} [c.icon] - icon to be displayed.
     * @param {function} [c.actionFn] - Executed when the user clicks the menuitem.
     * @param {Object[]} [c.items] - child menu items.
     * @param {boolean} [c.disabled] - true to disable this item.
     * @param {boolean} [c.hidden] - true to hide this item.
     */
    constructor({
        text,
        icon = null,
        actionFn = null,
        items = null,
        disabled = false,
        hidden = false
    }) {
        this.text = text;
        this.icon = icon;
        this.actionFn = actionFn;
        this.items = items;
        this.disabled = disabled;
        this.hidden = hidden;
    }

    /**
     * Standard Framework Menu Items
     */
    static reloadApp(defs) {
        return assign({
            text: 'Reload App',
            icon: Icon.refresh(),
            actionFn: () => XH.reloadApp()
        }, defs);
    }

    static about(defs) {
        return assign({
            text: 'About',
            icon: Icon.info(),
            actionFn: () => XH.showAboutDialog()
        }, defs);
    }

    static logout(defs) {
        return assign({
            text: 'Logout',
            icon: Icon.logout(),
            hidden: !XH.appSpec.authLogin,
            actionFn: () => XH.identityService.logoutAsync()
        }, defs);
    }
}
