/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {menu, menuItem, menuDivider, popover} from '@xh/hoist/kit/blueprint';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

@HoistComponent
export class AppMenuButton extends Component {
    static propTypes = {
        /** True to hide the Launch Admin Item. Always hidden for users w/o HOIST_ADMIN role. */
        hideAdminItem: PT.bool,

        /** True to hide the Feedback Item. */
        hideFeedbackItem: PT.bool,

        /** True to hide the Options button. */
        hideOptionsItem: PT.bool,

        /** True to hide the Theme Toggle button. */
        hideThemeItem: PT.bool,

        /** True to hide the Logout button. Always hidden when `appSpec.isSSO == true`. */
        hideLogoutItem: PT.bool,

        /**
         * Array of configs for additional menu items to be shown.
         */
        extraItems: PT.array
    };

    baseClassName = 'xh-app-menu';

    render() {
        let {hideOptions, hideFeedback, hideTheme, hideAdmin, hideLogout, extraItems} = this.props;
        extraItems = extraItems ?
            [...extraItems.map(m => menuItem(m)), menuDivider()]  :
            [];

        const hideAdmin = hideAdminItem || !XH.getUser().isHoistAdmin,
            hideLogout = hideLogoutItem || XH.appSpec.isSSO;

        // TODO:  Need logic from context menu to remove duplicate seperators!
        return popover({
            position: 'bottom-right',
            minimal: true,
            target: button({
                icon: Icon.bars()
            }),
            content: menu(
                ...extraItems,
                menuItem({
                    omit: hideOptionsItem || !XH.acm.optionsDialogModel.hasOptions,
                    text: 'Options',
                    icon: Icon.options(),
                    onClick: () => XH.showOptionsDialog()
                }),
                menuItem({
                    omit: hideFeedbackItem,
                    text: 'Feedback',
                    icon: Icon.comment({className: 'fa-flip-horizontal'}),
                    onClick: () => XH.showFeedbackDialog()
                }),
                menuItem({
                    omit: hideThemeItem,
                    text: XH.darkTheme ? 'Light Theme' : 'Dark Theme',
                    icon: XH.darkTheme ? Icon.sun({prefix: 'fas'}) : Icon.moon(),
                    onClick: () => XH.toggleTheme()
                }),
                menuDivider({omit: hideAdmin}),
                menuItem({
                    omit: hideAdmin,
                    text: 'Admin',
                    icon: Icon.wrench(),
                    onClick: () => window.open('/admin')
                }),
                menuDivider({omit: hideLogout}),
                menuItem({
                    omit: hideLogout,
                    text: 'Logout',
                    icon: Icon.logout(),
                    intent: 'danger',
                    onClick: () => XH.identityService.logoutAsync()
                })
            )
        });
    }
}

export const appMenuButton = elemFactory(AppMenuButton);