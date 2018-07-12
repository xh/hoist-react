/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {navbar, navbarGroup} from '@xh/hoist/kit/blueprint';
import {feedbackButton, launchAdminButton, logoutButton, refreshButton, themeToggleButton} from '@xh/hoist/desktop/cmp/button';
import {span} from '@xh/hoist/cmp/layout';
import {appBarSeparator} from '@xh/hoist/desktop/cmp/appbar';
import {isEmpty} from 'lodash';
import './AppBar.scss';

/**
 * A standard application navigation bar which displays the application name and a standard set of
 * buttons for common application actions. Application specific items can be displayed on the left
 * or right sides of the AppBar.
 *
 * The standard buttons which are visible will be based on user roles and application configuration,
 * or they can each be explicitly hidden.
 */
@HoistComponent()
export class AppBar extends Component {
    static propTypes = {
        /** Icon to display before the title. */
        icon: PT.element,
        /** Title to display to the left side of the AppBar. Defaults to the application name if not provided. */
        title: PT.string,
        /** Items to be added to the left side of the AppBar, immediately after the title (or . */
        leftItems: PT.node,
        /** Items to be added to the right side of the AppBar, before the standard buttons. */
        rightItems: PT.node,
        /** Set to true to hide the Launch Admin button. Will be automatically hidden for users without the HOIST_ADMIN role. */
        hideAdminButton: PT.bool,
        /** Set to true to hide the Feedback button. */
        hideFeedbackButton: PT.bool,
        /** Set to true to hide the Theme Toggle button. */
        hideThemeButton: PT.bool,
        /** Set to true to hide the Logout button. Will be automatically hidden for applications with logout disabled. */
        hideLogoutButton: PT.bool,
        /** Set to true to hide the Refresh button. */
        hideRefreshButton: PT.bool,
        /** Allows overriding the default properties of the Refresh button. @see RefreshButton */
        refreshButtonProps: PT.object
    };

    render() {
        const {icon, title, leftItems, rightItems, hideAdminButton, hideFeedbackButton, hideThemeButton, hideLogoutButton, hideRefreshButton, refreshButtonProps = {}} = this.props;
        return navbar({
            cls: 'xh-appbar',
            items: [
                navbarGroup({
                    align: 'left',
                    items: [
                        icon,
                        span({cls: 'xh-appbar-title', item: title || XH.appName}),
                        appBarSeparator({omit: isEmpty(leftItems)}),
                        ...leftItems || []
                    ]
                }),
                navbarGroup({
                    align: 'right',
                    items: [
                        ...rightItems || [],
                        feedbackButton({omit: hideFeedbackButton}),
                        themeToggleButton({omit: hideThemeButton}),
                        launchAdminButton({omit: hideAdminButton}),
                        logoutButton({omit: hideLogoutButton}),
                        refreshButton({
                            omit: hideRefreshButton,
                            intent: 'success',
                            ...refreshButtonProps
                        })
                    ]
                })
            ]
        });
    }
}

export const appBar = elemFactory(AppBar);