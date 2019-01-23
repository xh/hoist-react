/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {menu, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

@HoistComponent
export class AppMenuButton extends Component {
    static propTypes = {
        /** True to hide the Options button. */
        hideOptionsButton: PT.bool,

        /** True to hide the Feedback button. */
        hideFeedbackButton: PT.bool,

        /** True to hide the Theme Toggle button. */
        hideThemeButton: PT.bool,

        /**
         * True to hide the Launch Admin button. Will be automatically hidden for users
         * without the HOIST_ADMIN role.
         */
        hideAdminButton: PT.bool,

        /**
         * True to hide the Logout button (always hidden for SSO applications).
         */
        hideLogoutButton: PT.bool
    };

    baseClassName = 'xh-app-menu';

    render() {
        const {
            hideOptionsButton,
            hideFeedbackButton,
            hideThemeButton,
            hideAdminButton,
            hideLogoutButton
        } = this.props;

        return popover({
            position: 'bottom-right',
            minimal: true,
            target: button({
                icon: Icon.bars()
            }),
            content: menu(
                menuItem({
                    omit: hideOptionsButton || !XH.acm.optionsDialogModel.hasOptions,
                    text: 'Options',
                    icon: Icon.gear(),
                    onClick: () => XH.showOptionsDialog()
                }),
                menuItem({
                    omit: hideFeedbackButton,
                    text: 'Feedback',
                    icon: Icon.comment({className: 'fa-flip-horizontal'}),
                    onClick: () => XH.showFeedbackDialog()
                }),
                menuItem({
                    omit: hideThemeButton,
                    text: XH.darkTheme ? 'Switch to light theme' : 'Switch to dark theme',
                    icon: XH.darkTheme ? Icon.sun({prefix: 'fas'}) : Icon.moon(),
                    onClick: () => XH.toggleTheme()
                }),
                menuItem({
                    omit: hideAdminButton || !XH.getUser().isHoistAdmin,
                    text: 'Admin',
                    icon: Icon.wrench(),
                    onClick: () => window.open('/admin')
                }),
                menuItem({
                    omit: hideLogoutButton || XH.appSpec.isSSO,
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