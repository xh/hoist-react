/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {div, span} from '@xh/hoist/cmp/layout';
import type {HoistProps, HSide, TestSupportProps} from '@xh/hoist/core';
import {hoistCmp, XH} from '@xh/hoist/core';
import {appBarSeparator} from '@xh/hoist/desktop/cmp/appbar';
import type {AppMenuButtonProps} from '@xh/hoist/desktop/cmp/button';
import {appMenuButton, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {whatsNewButton} from '@xh/hoist/desktop/cmp/button/WhatsNewButton';
import '@xh/hoist/desktop/register';
import {TEST_ID, withDefault} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isEmpty} from 'lodash';
import type {ReactElement, ReactNode} from 'react';
import './AppBar.scss';

export interface AppBarProps extends HoistProps, TestSupportProps {
    /** Position of the AppMenuButton. */
    appMenuButtonPosition?: HSide;

    /** Allows overriding the default properties of the App Menu button. @see AppMenuButton */
    appMenuButtonProps?: AppMenuButtonProps;

    /** True to hide the AppMenuButton. */
    hideAppMenuButton?: boolean;

    /** True to hide the Refresh button. */
    hideRefreshButton?: boolean;

    /** True to hide the "What's New?" button, even if an unread changelog entry is available. */
    hideWhatsNewButton?: boolean;

    /** Icon to display to the left of the title. */
    icon?: ReactElement;

    /** Items to be added to the left side of the AppBar, immediately after the title. */
    leftItems?: ReactNode[];

    /** Items to be added to the right side of the AppBar, before the standard buttons. */
    rightItems?: ReactNode[];

    /** Title to display to the left side of the AppBar. Defaults to XH.clientAppName. */
    title?: ReactNode;
}

/**
 * A standard application navigation bar which displays the application name and a standard set of
 * buttons for common application actions. Application specific items can be displayed on the left
 * or right sides of the AppBar.
 *
 * The standard buttons which are visible will be based on user roles and application configuration,
 * or they can each be explicitly hidden.
 */
export const [AppBar, appBar] = hoistCmp.withFactory<AppBarProps>({
    displayName: 'AppBar',
    model: false,
    className: 'xh-appbar',

    render(props) {
        const {
            icon,
            leftItems,
            rightItems,
            hideWhatsNewButton,
            hideRefreshButton,
            hideAppMenuButton,
            className,
            appMenuButtonProps = {},
            appMenuButtonPosition = 'right',
            testId
        } = props;

        const title = withDefault(props.title, XH.clientAppName);

        // Blueprint's navbar class names are kept, so its styles and any app CSS still apply.
        return div({
            className: classNames('bp6-navbar', className),
            children: [
                div({
                    className: 'xh-appbar__group bp6-navbar-group bp6-align-left',
                    children: [
                        appMenuButton({
                            omit: hideAppMenuButton || appMenuButtonPosition != 'left',
                            ...appMenuButtonProps
                        }),
                        icon ? span({className: 'xh-appbar-icon', children: icon}) : null,
                        title ? span({className: 'xh-appbar-title', children: title}) : null,
                        appBarSeparator({omit: isEmpty(leftItems)}),
                        ...(leftItems ?? [])
                    ]
                }),
                div({
                    className: 'xh-appbar__group bp6-navbar-group bp6-align-right',
                    children: [
                        ...(rightItems ?? []),
                        whatsNewButton({omit: hideWhatsNewButton}),
                        refreshButton({omit: hideRefreshButton}),
                        appMenuButton({
                            omit: hideAppMenuButton || appMenuButtonPosition != 'right',
                            ...appMenuButtonProps
                        })
                    ]
                })
            ],
            [TEST_ID]: testId
        });
    }
});
