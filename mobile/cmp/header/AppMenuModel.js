/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {MenuModel} from '@xh/hoist/mobile/cmp/menu';
import {Icon} from '@xh/hoist/icon';

/**
 * An top-level application drop down menu, which installs a standard set of menu items for common
 * application actions. Application specific items can be displayed before these standard items.
 *
 * The standard items which are visible will be based on user roles and application configuration,
 * or they can each be explicitly hidden.
 */
export class AppMenuModel extends MenuModel {

    /**
     * @param {Object} c - AppMenuModel configuration.
     * @param {Object[]} c.itemModels - See MenuModel.
     * @param {number} [c.xPos] - See MenuModel.
     * @param {number} [c.yPos] - See MenuModel.
     * @param {boolean} [c.hideOptionsItem] - true to hide the Options menu item.
     * @param {boolean} [c.hideFeedbackItem] - true to hide the Feedback menu item.
     * @param {boolean} [c.hideThemeItem] - true to hide the Theme Toggle menu item.
     * @param {boolean} [c.hideLogoutItem] - true to hide the Logout menu item.
     *          Will be automatically hidden for applications with logout disabled
     */
    constructor({
        itemModels = [],
        xPos = 10,
        yPos = 38,
        hideOptionsItem,
        hideFeedbackItem,
        hideThemeItem,
        hideLogoutItem
    } = {}) {
        const standardItems = [
            {
                icon: Icon.options(),
                text: 'Options',
                action: () => XH.showOptionsDialog(),
                prepareFn: (item) => item.hidden = hideOptionsItem || !XH.acm.optionsDialogModel.hasOptions
            },
            {
                icon: Icon.comment(),
                text: 'Feedback',
                action: () => XH.showFeedbackDialog(),
                prepareFn: (item) => item.hidden = hideFeedbackItem
            },
            {
                action: () => XH.toggleTheme(),
                prepareFn: (item) => {
                    item.hidden = hideThemeItem;
                    item.text = XH.darkTheme ? 'Light Theme' : 'Dark Theme';
                    item.icon = XH.darkTheme ? Icon.sun() : Icon.moon();
                }
            },
            {
                icon: Icon.impersonate(),
                text: 'Impersonate',
                action: () => XH.acm.impersonationBarModel.show(),
                prepareFn: (item) => item.hidden = !XH.identityService.canImpersonate
            },
            {
                icon: Icon.logout(),
                text: 'Logout',
                action: () => XH.identityService.logoutAsync(),
                prepareFn: (item) => item.hidden = hideLogoutItem || XH.appSpec.isSSO
            }
        ];

        itemModels.push(...standardItems);
        super({itemModels, xPos, yPos});
    }

}