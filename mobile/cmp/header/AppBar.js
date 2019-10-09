/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {NavigatorModel} from '@xh/hoist/mobile/cmp/navigator';
import PT from 'prop-types';
import {XH, hoistCmp, useContextModel} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import {button, navigatorBackButton, menuButton, refreshButton} from '@xh/hoist/mobile/cmp/button';

import './AppBar.scss';

/**
 * A standard application navigation bar which displays the current page title and a standard set of
 * buttons for common application actions. Application specific items can be displayed on the left
 * or right sides of the AppBar.
 *
 * The standard buttons which are visible will be based on user roles and application configuration,
 * or they can each be explicitly hidden.
 */
export const [AppBar, appBar] = hoistCmp.withFactory({
    displayName: 'AppBar',
    className: 'xh-appbar',
    model: false, memo: false,

    render({
        className,
        icon,
        title,
        leftItems,
        rightItems,
        hideAppMenuButton,
        hideBackButton,
        hideRefreshButton,
        appMenuButtonProps = {},
        backButtonProps = {},
        refreshButtonProps = {}
    }) {

        const navigatorModel = useContextModel(NavigatorModel);

        return toolbar({
            className,
            items: [
                div({
                    className: 'xh-appbar-left',
                    items: [
                        navigatorBackButton({
                            omit: hideBackButton,
                            ...backButtonProps
                        }),
                        ...leftItems || []
                    ]
                }),
                button({
                    icon: icon,
                    omit: !icon,
                    onClick: () => {
                        if (XH.routerModel.hasRoute('default')) {
                            XH.navigate('default');
                        }
                    }
                }),
                div({
                    className: 'xh-appbar-title',
                    item: title || XH.clientAppName
                }),
                div({
                    className: 'xh-appbar-right',
                    items: [
                        ...rightItems || [],
                        refreshButton({
                            omit: hideRefreshButton,
                            disabled: navigatorModel?.disableAppRefreshButton,
                            ...refreshButtonProps
                        }),
                        menuButton({
                            omit: hideAppMenuButton,
                            ...appMenuButtonProps
                        })
                    ]
                })
            ]
        });
    }
});

AppBar.propTypes = {
    /** App icon to display to the left of the title. */
    icon: PT.element,

    /** Title to display to the center the AppBar. Defaults to XH.clientAppName. */
    title: PT.string,

    /** Items to be added to the left side of the AppBar, before the title buttons. */
    leftItems: PT.node,

    /** Items to be added to the right side of the AppBar, before the refresh button. */
    rightItems: PT.node,
    
    /** True to hide the AppMenuButton. */
    hideAppMenuButton: PT.bool,

    /** Set to true to hide the Back button. */
    hideBackButton: PT.bool,

    /** Set to true to hide the Refresh button. */
    hideRefreshButton: PT.bool,

    /** Allows overriding the default properties of the App Menu button. @see MenuButton */
    appMenuButtonProps: PT.object,

    /** Allows overriding the default properties of the Back button. @see NavigatorBackButton */
    backButtonProps: PT.object,

    /** Allows overriding the default properties of the Refresh button. @see RefreshButton */
    refreshButtonProps: PT.object
};