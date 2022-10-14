/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {ButtonProps, button} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, MenuDivider, MenuItem, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {withDefault} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import {ReactElement, isValidElement} from 'react';

export const [AppMenuButton, appMenuButton] = hoistCmp.withFactory<AppMenuButtonProps>({
    displayName: 'AppMenuButton',
    model: false,
    className: 'xh-app-menu',

    render(props) {
        const {
            className, extraItems,
            hideAboutItem, hideAdminItem, hideChangelogItem, hideFeedbackItem, hideImpersonateItem,
            hideLogoutItem, hideOptionsItem, hideThemeItem, disabled, ...rest} = props;

        return popover({
            className,
            disabled,
            position: 'bottom-right',
            minimal: true,
            target: button({
                icon: Icon.bars(),
                disabled,
                ...rest
            }),
            content: menu(buildMenuItems(props))
        });
    }
});

export interface AppMenuButtonProps extends ButtonProps {
    /**
     * Array of extra menu items. Can contain:
     *  + `MenuItems` or configs to create them.
     *  + `MenuDividers` or the special string token '-'.
     *  + React Elements or strings, which will be interpreted as the `text` property for a MenuItem.
     */
    extraItems?: (Record<string, any>|string|ReactElement)[] // Todo: Use MenuItemSpec type rather than Record<string,any>

    /** True to hide the About button */
    hideAboutItem?: boolean,

    /** True to hide the Admin Item. Always hidden for users w/o HOIST_ADMIN role. */
    hideAdminItem?: boolean,

    /**
     * True to hide the Changelog (release notes) item.
     * Always hidden when ChangelogService not enabled / populated.
     */
    hideChangelogItem?: boolean,

    /** True to hide the Feedback Item. */
    hideFeedbackItem?: boolean,

    /**
     * True to hide the Impersonate Item.
     * Always hidden for users w/o HOIST_ADMIN role or if impersonation is disabled.
     */
    hideImpersonateItem?: boolean,

    /** True to hide the Logout button. Defaulted to appSpec.isSSO. */
    hideLogoutItem?: boolean,

    /** True to hide the Options button. */
    hideOptionsItem?: boolean,

    /** True to hide the Theme Toggle button. */
    hideThemeItem?: boolean,
}

//---------------------------
// Implementation
//---------------------------
function buildMenuItems(props: AppMenuButtonProps) {
    let {
        hideAboutItem,
        hideAdminItem,
        hideChangelogItem,
        hideFeedbackItem,
        hideImpersonateItem,
        hideLogoutItem,
        hideOptionsItem,
        hideThemeItem,
        extraItems = []
    } = props;

    hideAboutItem = hideAboutItem || !XH.appContainerModel.hasAboutDialog();
    hideAdminItem = hideAdminItem || !XH.getUser().isHoistAdmin;
    hideChangelogItem = hideChangelogItem || !XH.changelogService.enabled;
    hideImpersonateItem = hideImpersonateItem || !XH.identityService.canImpersonate;
    hideLogoutItem = withDefault(hideLogoutItem, XH.appSpec.isSSO);
    hideOptionsItem = hideOptionsItem || !XH.appContainerModel.optionsDialogModel.hasOptions;

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
            omit: hideChangelogItem,
            text: 'Release Notes',
            icon: Icon.gift(),
            onClick: () => XH.showChangelog()
        },
        {
            omit: hideAboutItem,
            text: `About ${XH.clientAppName}`,
            icon: Icon.info(),
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

    return parseMenuItems([
        ...extraItems,
        '-',
        ...defaultItems
    ]);
}

// Todo: Use MenuItemSpec type rather than Record<string,any>
function parseMenuItems(items: (Record<string, any>|string|ReactElement)[]) {
    const i = items as any;
    return i.filter(it => !it.omit)
        .filter(filterConsecutiveMenuSeparators())
        .map(it => {
            if (it === '-') return menuDivider();
            if (isValidElement(it)) {
                if (it instanceof MenuItem || it instanceof MenuDivider) return it;
                return menuItem({text: it});
            }

            // Create menuItem from config, recursively parsing any submenus
            const cfg = {...it};
            if (!isEmpty(cfg.items)) {
                cfg.items = parseMenuItems(cfg.items);
                cfg.popoverProps = {openOnTargetFocus: false};
            }
            return menuItem(cfg);
        });
}
