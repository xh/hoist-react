/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {Button, button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import React from 'react';

export const [AppMenuButton, appMenuButton] = hoistCmp.withFactory({
    displayName: 'AppMenuButton',
    model: false,
    className: 'xh-app-menu',

    render(props) {
        const {className, extraItems, hideAdminItem, hideImpersonateItem, hideFeedbackItem, hideLogoutItem, hideOptionsItem, hideThemeItem, hideAboutItem, ...rest} = props;

        return popover({
            className,
            position: 'bottom-right',
            minimal: true,
            target: button({
                icon: Icon.bars(),
                ...rest
            }),
            content: menu(buildMenuItems(props))
        });
    }
});

AppMenuButton.propTypes = {
    ...Button.propTypes,

    /**
     * Array of app-specific menu items. Can contain `MenuItem` configs, React Elements, or the
     * special string token '-' (to render a `MenuDivider`).
     */
    extraItems: PT.array,

    /** True to hide the Admin Item. Always hidden for users w/o HOIST_ADMIN role. */
    hideAdminItem: PT.bool,

    /**
     * True to hide the Impersonate Item.
     * Always hidden for users w/o HOIST_ADMIN role or if impersonation is disabled.
     */
    hideImpersonateItem: PT.bool,

    /** True to hide the Feedback Item. */
    hideFeedbackItem: PT.bool,

    /** True to hide the Logout button. Defaulted to appSpec.isSSO. */
    hideLogoutItem: PT.bool,

    /** True to hide the Options button. */
    hideOptionsItem: PT.bool,

    /** True to hide the Theme Toggle button. */
    hideThemeItem: PT.bool,

    /** True to hide the About button */
    hideAboutItem: PT.bool
};

//---------------------------
// Implementation
//---------------------------
function buildMenuItems({
    hideOptionsItem,
    hideFeedbackItem,
    hideThemeItem,
    hideAdminItem,
    hideImpersonateItem,
    hideLogoutItem,
    hideAboutItem,
    extraItems = []
}) {
    hideOptionsItem = hideOptionsItem || !XH.acm.optionsDialogModel.hasOptions;
    hideAdminItem = hideAdminItem || !XH.getUser().isHoistAdmin;
    hideImpersonateItem = hideImpersonateItem || !XH.identityService.canImpersonate;
    hideLogoutItem = withDefault(hideLogoutItem, XH.appSpec.isSSO);

    const defaultItems = [
        {
            omit: hideOptionsItem,
            text: 'Options',
            icon: Icon.options(),
            onClick: () => XH.showOptionsDialog()
        },
        {
            omit: hideFeedbackItem,
            text: 'Feedback',
            icon: Icon.comment({className: 'fa-flip-horizontal'}),
            onClick: () => XH.showFeedbackDialog()
        },
        {
            omit: hideThemeItem,
            text: XH.darkTheme ? 'Light Theme' : 'Dark Theme',
            icon: XH.darkTheme ? Icon.sun({prefix: 'fas'}) : Icon.moon(),
            onClick: () => XH.toggleTheme()
        },
        '-',
        {
            omit: hideAdminItem,
            text: 'Admin',
            icon: Icon.wrench(),
            onClick: () => window.open('/admin')
        },
        {
            omit: hideImpersonateItem,
            text: 'Impersonate',
            icon: Icon.impersonate(),
            onClick: () => XH.showImpersonationBar()
        },
        '-',
        {
            omit: hideAboutItem,
            icon: Icon.info(),
            text: `About ${XH.clientAppName}`,
            onClick: () => XH.showAboutDialog()
        },
        '-',
        {
            omit: hideLogoutItem,
            text: 'Logout',
            icon: Icon.logout(),
            intent: 'danger',
            onClick: () => XH.identityService.logoutAsync()
        }
    ];

    return [
        ...extraItems,
        '-',
        ...defaultItems
    ]
        .filter(it => !it.omit)
        .filter(filterConsecutiveMenuSeparators())
        .map(it => {
            if (it === '-') return menuDivider();
            return React.isValidElement(it) ? it : menuItem(it);
        });
}
