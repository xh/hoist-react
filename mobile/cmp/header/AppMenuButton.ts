/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp, MenuItemLike, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {menuButton, MenuButtonProps} from '@xh/hoist/mobile/cmp/menu';
import '@xh/hoist/mobile/register';
import {withDefault} from '@xh/hoist/utils/js';

export interface AppMenuButtonProps extends MenuButtonProps {
    /** Array of app-specific MenuItems or configs to create them. */
    extraItems?: MenuItemLike[];

    /**
     * True to hide the Impersonate item.  Always hidden for users w/o HOIST_ADMIN role or
     * if impersonation is disabled.
     */
    hideImpersonateItem?: boolean;

    /** True to hide the Feedback item. */
    hideFeedbackItem?: boolean;

    /** True to hide the Logout button. Defaulted to appSpec.isSSO. */
    hideLogoutItem?: boolean;

    /** True to hide the Options button. */
    hideOptionsItem?: boolean;

    /** True to hide the Theme Toggle button. */
    hideThemeItem?: boolean;

    /** True to hide the About button */
    hideAboutItem?: boolean;
}

/**
 * A top-level application drop down menu, which installs a standard set of menu items for common
 * application actions. Application specific items can be displayed before these standard items.
 *
 * The standard items which are visible will be based on user roles and application configuration,
 * or they can each be explicitly hidden.
 */
export const [AppMenuButton, appMenuButton] = hoistCmp.withFactory<AppMenuButtonProps>({
    displayName: 'AppMenuButton',
    model: false,
    className: 'xh-app-menu-button',

    render(props) {
        const {
            className,
            extraItems,
            hideImpersonateItem,
            hideFeedbackItem,
            hideLogoutItem,
            hideOptionsItem,
            hideThemeItem,
            hideAboutItem,
            ...rest
        } = props;

        return menuButton({
            className,
            menuItems: buildMenuItems(props),
            popoverProps: {popoverClassName: 'xh-app-menu'},
            ...rest
        });
    }
});

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
}: AppMenuButtonProps): MenuItemLike[] {
    hideAboutItem = hideAboutItem || !XH.appContainerModel.hasAboutDialog();
    hideOptionsItem = hideOptionsItem || !XH.appContainerModel.optionsDialogModel.hasOptions;
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
            text: 'Theme',
            prepareFn: item => {
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
