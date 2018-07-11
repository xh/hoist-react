/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div} from '@xh/hoist/layout';
import {toolbar} from '@xh/hoist/mobile/onsen';
import {navigatorBackButton, themeToggleButton, logoutButton, refreshButton} from '@xh/hoist/mobile/cmp/button';

/**
 * A standard application navigation bar which displays the current page title and a standard set of
 * buttons for common application actions. Application specific items can be displayed on the left
 * or right sides of the AppBar.
 *
 * The standard buttons which are visible will be based on user roles and application configuration,
 * or they can each be explicitly hidden.
 */
@HoistComponent()
export class AppBar extends Component {

    static propTypes = {
        /** Navigator model. Bound to back button and title. */
        navigatorModel: PT.object,
        /** Title to display to the center the AppBar. Defaults to the current page title if not provided. */
        title: PT.string,
        /** Items to be added to the left side of the AppBar, immediately after the back button . */
        leftItems: PT.node,
        /** Items to be added to the right side of the AppBar, before the standard buttons. */
        rightItems: PT.node,
        /** Set to true to hide the Theme Toggle button. */
        hideThemeButton: PT.bool,
        /** Set to true to hide the Logout button. Will be automatically hidden for applications with logout disabled. */
        hideLogoutButton: PT.bool,
        /** Set to true to hide the Refresh button. */
        hideRefreshButton: PT.bool,
        /** Allows overriding the default properties of the Back button. @see NavigatorBackButton */
        backButtonProps: PT.object,
        /** Allows overriding the default properties of the Refresh button. @see RefreshButton */
        refreshButtonProps: PT.object
    };

    render() {
        const {navigatorModel, title, leftItems, rightItems, hideThemeButton, hideLogoutButton, hideRefreshButton, backButtonProps, refreshButtonProps = {}} = this.props;

        return toolbar({
            cls: 'xh-appbar',
            items: [
                div({
                    cls: 'left',
                    item: navigatorBackButton({
                        model: navigatorModel,
                        ...backButtonProps
                    }),
                    ...leftItems || []
                }),
                div({
                    cls: 'center',
                    item: title || navigatorModel.title
                }),
                div({
                    cls: 'right',
                    items: [
                        ...rightItems || [],
                        themeToggleButton({omit: hideThemeButton}),
                        logoutButton({omit: hideLogoutButton}),
                        refreshButton({
                            omit: hideRefreshButton,
                            ...refreshButtonProps
                        })
                    ]
                })
            ]
        });
    }

}

export const appBar = elemFactory(AppBar);