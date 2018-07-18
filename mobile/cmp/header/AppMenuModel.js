/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {MenuModel} from '@xh/hoist/mobile/cmp/menu';
import {Icon} from '@xh/hoist/icon';

/**
 * A standard application drop down menu, which installs a standard set of menu items for common
 * application actions. Application specific items can be displayed before these standard items.
 *
 * The standard items which are visible will be based on user roles and application configuration,
 * or they can each be explicitly hidden.
 */
export class AppMenuModel extends MenuModel {

    /**
     * @param {Object[]} itemModels - See MenuModel.
     * @param {number} [xPos] - See MenuModel.
     * @param {number} [yPos] - See MenuModel.
     * @param {bool} [hideFeedbackItem] - Set to true to hide the Feedback menu item.
     * @param {bool} [hideThemeItem] - Set to true to hide the Theme Toggle menu item.
     * @param {bool} [hideLogoutItem] - Set to true to hide the Logout menu item.
     *          Will be automatically hidden for applications with logout disabled
     */
    constructor({
        itemModels = [],
        xPos = 10,
        yPos = 40,
        hideFeedbackItem,
        hideThemeItem,
        hideLogoutItem
    } = {}) {
        const standardItems = [
            {
                icon: Icon.comment(),
                text: 'Feedback',
                action: () => XH.showFeedbackDialog(),
                prepareFn: (item) => item.hidden = hideFeedbackItem
            },
            {
                icon: XH.darkTheme ? Icon.sun() : Icon.moon(),
                text: XH.darkTheme ? 'Light theme' : 'Dark theme',
                action: () => XH.toggleTheme(),
                prepareFn: (item) => item.hidden = hideThemeItem
            },
            {
                icon: Icon.logout(),
                text: 'Logout',
                action: () => XH.identityService.logoutAsync(),
                prepareFn: (item) => item.hidden = hideLogoutItem || !XH.app.enableLogout
            }
        ];

        itemModels.push(...standardItems);
        super({itemModels, xPos, yPos});
    }

}