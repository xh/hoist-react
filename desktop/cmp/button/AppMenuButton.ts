/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {MenuItemProps} from '@blueprintjs/core';
import {hoistCmp, MenuItemLike, MenuItem, XH} from '@xh/hoist/core';
import {ButtonProps, button} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {wait} from '@xh/hoist/promise';
import {filterConsecutiveMenuSeparators, isOmitted} from '@xh/hoist/utils/impl';
import {withDefault} from '@xh/hoist/utils/js';
import {clone, isEmpty, isString} from 'lodash';
import {isValidElement, ReactNode} from 'react';

export interface AppMenuButtonProps extends ButtonProps {
    /**
     * Array of extra menu items. Can contain:
     *  + `MenuItems` or configs to create them.
     *  + `MenuDividers` or the special string token '-'.
     *  + React Elements or strings, which will be interpreted as the `text` property for a MenuItem.
     */
    extraItems?: MenuItemLike[];

    /** True to hide the About button */
    hideAboutItem?: boolean;

    /** True to hide the Admin Item. Always hidden for users w/o HOIST_ADMIN role. */
    hideAdminItem?: boolean;

    /**
     * True to hide the Changelog (release notes) item.
     * Always hidden when ChangelogService not enabled / populated.
     */
    hideChangelogItem?: boolean;

    /** True to hide the Feedback Item. */
    hideFeedbackItem?: boolean;

    /**
     * True to hide the Impersonate Item.
     * Always hidden for users w/o HOIST_ADMIN role or if impersonation is disabled.
     */
    hideImpersonateItem?: boolean;

    /** True to hide the Logout button. Defaulted to !appSpec.enableLogout. */
    hideLogoutItem?: boolean;

    /** True to hide the Options button. */
    hideOptionsItem?: boolean;

    /** True to hide the Theme Toggle button. */
    hideThemeItem?: boolean;
}

export const [AppMenuButton, appMenuButton] = hoistCmp.withFactory<AppMenuButtonProps>({
    displayName: 'AppMenuButton',
    model: false,
    className: 'xh-app-menu-button',

    render(props) {
        const {
            className,
            extraItems,
            hideAboutItem,
            hideAdminItem,
            hideChangelogItem,
            hideFeedbackItem,
            hideImpersonateItem,
            hideLogoutItem,
            hideOptionsItem,
            hideThemeItem,
            disabled,
            ...rest
        } = props;

        return popover({
            className,
            disabled,
            position: 'bottom-right',
            minimal: true,
            item: button({
                icon: Icon.menu(),
                disabled,
                ...rest
            }),
            popoverClassName: 'xh-app-menu-popover',
            content: menu({
                className: 'xh-app-menu',
                items: buildMenuItems(props)
            })
        });
    }
});

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
    hideAdminItem = hideAdminItem || !XH.getUser().isHoistAdminReader;
    hideChangelogItem = hideChangelogItem || !XH.changelogService.enabled;
    hideImpersonateItem = hideImpersonateItem || !XH.identityService.canImpersonate;
    hideLogoutItem = withDefault(hideLogoutItem, !XH.appSpec.enableLogout);
    hideOptionsItem = hideOptionsItem || !XH.appContainerModel.optionsDialogModel.hasOptions;

    const defaultItems: MenuItemLike[] = [
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
            text: XH.darkTheme ? 'Light Theme' : 'Dark Theme',
            icon: XH.darkTheme ? Icon.sun({prefix: 'fas'}) : Icon.moon(),
            actionFn: () => XH.toggleTheme()
        },
        '-',
        {
            omit: hideAdminItem,
            text: 'Admin',
            icon: Icon.wrench(),
            actionFn: () => window.open('/admin')
        },
        {
            omit: hideImpersonateItem,
            text: 'Impersonate',
            icon: Icon.impersonate(),
            actionFn: () => XH.showImpersonationBar()
        },
        '-',
        {
            omit: hideChangelogItem,
            text: 'Release Notes',
            icon: Icon.gift(),
            actionFn: () => XH.showChangelog()
        },
        {
            omit: hideAboutItem,
            text: `About ${XH.clientAppName}`,
            icon: Icon.info(),
            actionFn: () => XH.showAboutDialog()
        },
        '-',
        {
            omit: hideLogoutItem,
            text: 'Logout',
            icon: Icon.logout(),
            intent: 'danger',
            actionFn: () => XH.identityService.logoutAsync()
        }
    ];

    return parseMenuItems([...extraItems, '-', ...defaultItems]);
}

function parseMenuItems(items: MenuItemLike[]): ReactNode[] {
    items = items.map(item => {
        if (!isMenuItem(item)) return item;

        item = clone(item);
        item.items = clone(item.items);
        item.prepareFn?.(item);
        return item;
    });

    return items
        .filter(it => !isMenuItem(it) || (!it.hidden && !isOmitted(it)))
        .filter(filterConsecutiveMenuSeparators())
        .map(item => {
            if (item === '-') return menuDivider();
            if (!isMenuItem(item)) return item;

            const {actionFn} = item;

            // Create menuItem from config
            const cfg: MenuItemProps = {
                text: item.text,
                icon: item.icon,
                intent: item.intent,
                className: item.className,
                onClick: actionFn ? () => wait().then(actionFn) : null, // do async to allow menu to close
                disabled: item.disabled
            };

            // Recursively parse any submenus
            if (!isEmpty(item.items)) {
                cfg.children = parseMenuItems(item.items);
                cfg.popoverProps = {openOnTargetFocus: false};
            }

            return menuItem(cfg);
        });
}

function isMenuItem(item: MenuItemLike): item is MenuItem {
    return !isString(item) && !isValidElement(item);
}
