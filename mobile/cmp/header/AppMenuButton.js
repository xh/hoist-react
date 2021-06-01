/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {menuButton} from '@xh/hoist/mobile/cmp/menu';
import {Button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';

/**
 * An top-level application drop down menu, which installs a standard set of menu items for common
 * application actions. Application specific items can be displayed before these standard items.
 *
 * The standard items which are visible will be based on user roles and application configuration,
 * or they can each be explicitly hidden.
 */
export const [AppMenuButton, appMenuButton] = hoistCmp.withFactory({
    displayName: 'AppMenuButton',
    model: false,
    className: 'xh-app-menu-button',

    render(props) {
        const {className, extraItems, hideImpersonateItem, hideFeedbackItem, hideLogoutItem, hideOptionsItem, hideThemeItem, hideAboutItem, ...rest} = props;

        return menuButton({
            className,
            menuItems: buildMenuItems(props),
            popoverProps: {popoverClassName: 'xh-app-menu'},
            ...rest
        });
    }
});

AppMenuButton.propTypes = {
    ...Button.propTypes,

    /** Array of app-specific MenuItems or configs to create them */
    extraItems: PT.array,

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
    hideImpersonateItem,
    hideLogoutItem,
    hideAboutItem,
    extraItems = []
}) {
    hideOptionsItem = hideOptionsItem || !XH.acm.optionsDialogModel.hasOptions;
    hideImpersonateItem = hideImpersonateItem || !XH.identityService.canImpersonate;
    hideLogoutItem = withDefault(hideLogoutItem, XH.appSpec.isSSO);

    const defaultItems = [
        {
            omit: hideOptionsItem,
            text: 'Options',
            icon: Icon.options(),
            actionFn: () => XH.showOptionsDialog()
        },
        {
            omit: hideFeedbackItem,
            text: 'Feedback',
            icon: Icon.comment({className: 'fa-flip-horizontal'}),
            actionFn: () => XH.showFeedbackDialog()
        },
        {
            omit: hideThemeItem,
            actionFn: () => XH.toggleTheme(),
            prepareFn: (item) => {
                item.text = XH.darkTheme ? 'Light Theme' : 'Dark Theme';
                item.icon = XH.darkTheme ? Icon.sun() : Icon.moon();
            }
        },
        {
            omit: hideImpersonateItem,
            text: 'Impersonate',
            icon: Icon.impersonate(),
            actionFn: () => XH.showImpersonationBar()
        },
        {
            omit: hideAboutItem,
            icon: Icon.info(),
            text: `About ${XH.clientAppName}`,
            actionFn: () => XH.showAboutDialog()
        },
        {
            omit: hideLogoutItem,
            text: 'Logout',
            icon: Icon.logout(),
            actionFn: () => XH.identityService.logoutAsync()
        }
    ];

    return [...extraItems, ...defaultItems];
}
