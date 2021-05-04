/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {Button, button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {withDefault} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import PT from 'prop-types';
import {isValidElement} from 'react';

export const [AppMenuButton, appMenuButton] = hoistCmp.withFactory({
    displayName: 'AppMenuButton',
    model: false,
    className: 'xh-app-menu',

    render(props) {
        const {
            className, extraItems,
            hideAboutItem, hideAdminItem, hideChangelogItem, hideFeedbackItem, hideImpersonateItem,
            hideLogoutItem, hideOptionsItem, hideThemeItem, ...rest} = props;

        return popover({
            className,
            placement: 'bottom-end',
            minimal: true,
            item: button({
                icon: Icon.bars(),
                ...rest
            }),
            content: menu(buildMenuItems(props))
        });
    }
});

AppMenuButton.propTypes = {
    ...Button.propTypes,

    className: PT.string,

    /**
     * Array of extra menu items. Can contain:
     *  + `MenuItems` or configs to create them.
     *  + `MenuDividers` or the special string token '-'.
     *  + React Elements or strings, which will be interpreted as the `text` property for a MenuItem.
     */
    extraItems: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.element])),

    /** True to hide the About button */
    hideAboutItem: PT.bool,

    /** True to hide the Admin Item. Always hidden for users w/o HOIST_ADMIN role. */
    hideAdminItem: PT.bool,

    /**
     * True to hide the Changelog (release notes) item.
     * Always hidden when ChangelogService not enabled / populated.
     */
    hideChangelogItem: PT.bool,

    /** True to hide the Feedback Item. */
    hideFeedbackItem: PT.bool,

    /**
     * True to hide the Impersonate Item.
     * Always hidden for users w/o HOIST_ADMIN role or if impersonation is disabled.
     */
    hideImpersonateItem: PT.bool,

    /** True to hide the Logout button. Defaulted to appSpec.isSSO. */
    hideLogoutItem: PT.bool,

    /** True to hide the Options button. */
    hideOptionsItem: PT.bool,

    /** True to hide the Theme Toggle button. */
    hideThemeItem: PT.bool

};

//---------------------------
// Implementation
//---------------------------
function buildMenuItems({
    hideAboutItem,
    hideAdminItem,
    hideChangelogItem,
    hideFeedbackItem,
    hideImpersonateItem,
    hideLogoutItem,
    hideOptionsItem,
    hideThemeItem,
    extraItems = []
}) {
    hideAdminItem = hideAdminItem || !XH.getUser().isHoistAdmin;
    hideChangelogItem = hideChangelogItem || !XH.changelogService.enabled,
    hideImpersonateItem = hideImpersonateItem || !XH.identityService.canImpersonate;
    hideLogoutItem = withDefault(hideLogoutItem, XH.appSpec.isSSO);
    hideOptionsItem = hideOptionsItem || !XH.acm.optionsDialogModel.hasOptions;

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

function parseMenuItems(items) {
    return items
        .filter(it => !it.omit)
        .filter(filterConsecutiveMenuSeparators())
        .map(it => {
            if (it === '-') return menuDivider();
            if (isValidElement(it)) {
                return ['Blueprint4.MenuItem', 'Blueprint4.MenuDivider'].includes(it.type.displayName) ?
                    it :
                    menuItem({text: it});
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
