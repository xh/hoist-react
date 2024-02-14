/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, HSide, useContextModel, XH} from '@xh/hoist/core';
import {
    button,
    navigatorBackButton,
    NavigatorBackButtonProps,
    refreshButton,
    RefreshButtonProps
} from '@xh/hoist/mobile/cmp/button';
import {NavigatorModel} from '@xh/hoist/mobile/cmp/navigator';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import '@xh/hoist/mobile/register';
import {ReactElement, ReactNode} from 'react';
import './AppBar.scss';
import {appMenuButton, AppMenuButtonProps} from './AppMenuButton';

export interface AppBarProps extends HoistProps {
    /** App icon to display to the left of the title. */
    icon?: ReactElement;

    /** Title to display to the center the AppBar. Defaults to XH.clientAppName. */
    title?: ReactNode;

    /** Items to be added to the left side of the AppBar, before the title buttons. */
    leftItems?: ReactNode[];

    /** Items to be added to the right side of the AppBar, before the refresh button. */
    rightItems?: ReactNode[];

    /** True to hide the AppMenuButton. */
    hideAppMenuButton?: boolean;

    /** Set to true to hide the Back button. */
    hideBackButton?: boolean;

    /** Set to true to hide the Refresh button. */
    hideRefreshButton?: boolean;

    /** Allows overriding the default properties of the App Menu button. @see MenuButton */
    appMenuButtonProps?: AppMenuButtonProps;

    /** Position of the AppMenuButton. */
    appMenuButtonPosition?: HSide;

    /** Allows overriding the default properties of the Back button. @see NavigatorBackButton */
    backButtonProps?: NavigatorBackButtonProps;

    /** Allows overriding the default properties of the Refresh button. @see RefreshButton */
    refreshButtonProps?: RefreshButtonProps;
}

/**
 * A standard application navigation bar which displays the current page title and a standard set of
 * buttons for common application actions. Application specific items can be displayed on the left
 * or right sides of the AppBar.
 *
 * The standard buttons which are visible will be based on user roles and application configuration,
 * or they can each be explicitly hidden.
 */
export const [AppBar, appBar] = hoistCmp.withFactory<AppBarProps>({
    displayName: 'AppBar',
    className: 'xh-appbar',
    model: false,

    render(
        {
            className,
            icon,
            title,
            leftItems,
            rightItems,
            hideAppMenuButton,
            hideBackButton,
            hideRefreshButton,
            appMenuButtonProps = {},
            appMenuButtonPosition = 'right',
            backButtonProps = {},
            refreshButtonProps = {}
        },
        ref
    ) {
        const navigatorModel = useContextModel(NavigatorModel);

        return toolbar({
            ref,
            className,
            items: [
                div({
                    className: 'xh-appbar-left',
                    items: [
                        navigatorBackButton({
                            omit: hideBackButton,
                            ...backButtonProps
                        }),
                        appMenuButton({
                            omit: hideAppMenuButton || appMenuButtonPosition != 'left',
                            menuPosition: 'bottom-right',
                            ...appMenuButtonProps
                        } as AppMenuButtonProps),
                        ...(leftItems || [])
                    ]
                }),
                button({
                    icon: icon,
                    omit: !icon,
                    onClick: () => {
                        // Navigate to root-level route
                        XH.navigate(XH.appModel.getRoutes()[0].name);
                    }
                }),
                div({
                    className: 'xh-appbar-title',
                    item: title || XH.clientAppName
                }),
                div({
                    className: 'xh-appbar-right',
                    items: [
                        ...(rightItems || []),
                        refreshButton({
                            omit: hideRefreshButton,
                            disabled: navigatorModel?.disableAppRefreshButton,
                            ...refreshButtonProps
                        }),
                        appMenuButton({
                            omit: hideAppMenuButton || appMenuButtonPosition != 'right',
                            menuPosition: 'bottom-left',
                            ...appMenuButtonProps
                        } as AppMenuButtonProps)
                    ]
                })
            ]
        });
    }
});
