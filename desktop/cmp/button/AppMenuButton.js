/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

@HoistComponent
export class AppMenuButton extends Component {
    static propTypes = {
        /** True to hide the Options item. */
        hideOptions: PT.bool,

        /** True to hide the Feedback item. */
        hideFeedback: PT.bool,

        /** True to hide the Theme Toggle */
        hideTheme: PT.bool,

        /**
         * True to hide the Launch Admin button. Will be automatically hidden for users
         * without the HOIST_ADMIN role.
         */
        hideAdmin: PT.bool,

        /**
         * True to hide the Logout button (always hidden for SSO applications).
         */
        hideLogout: PT.bool,

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
                    omit: hideOptions || !XH.acm.optionsDialogModel.hasOptions,
                    text: 'Options',
                    icon: Icon.gear(),
                    onClick: () => XH.showOptionsDialog()
                }),
                menuItem({
                    omit: hideFeedback,
                    text: 'Feedback',
                    icon: Icon.comment({className: 'fa-flip-horizontal'}),
                    onClick: () => XH.showFeedbackDialog()
                }),
                menuItem({
                    omit: hideTheme,
                    text: XH.darkTheme ? 'Switch to light theme' : 'Switch to dark theme',
                    icon: XH.darkTheme ? Icon.sun({prefix: 'fas'}) : Icon.moon(),
                    onClick: () => XH.toggleTheme()
                }),
                menuItem({
                    omit: hideAdmin || !XH.getUser().isHoistAdmin,
                    text: 'Admin',
                    icon: Icon.wrench(),
                    onClick: () => window.open('/admin')
                }),
                menuItem({
                    omit: hideLogout || XH.appSpec.isSSO,
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