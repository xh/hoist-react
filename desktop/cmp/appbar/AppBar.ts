/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, HSide, NoModel, TestSupportProps, XH} from '@xh/hoist/core';
import {appBarSeparator} from '@xh/hoist/desktop/cmp/appbar';
import {appMenuButton, AppMenuButtonProps, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {whatsNewButton} from '@xh/hoist/desktop/cmp/button/WhatsNewButton';
import '@xh/hoist/desktop/register';
import {navbar, navbarGroup} from '@xh/hoist/kit/blueprint';
import {TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import {ReactElement, ReactNode} from 'react';
import './AppBar.scss';

export interface AppBarProps extends HoistProps<NoModel>, TestSupportProps {
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

        return navbar({
            className,
            items: [
                navbarGroup({
                    align: 'left',
                    items: [
                        appMenuButton({
                            omit: hideAppMenuButton || appMenuButtonPosition != 'left',
                            ...appMenuButtonProps
                        }),
                        icon ? span({className: 'xh-appbar-icon', item: icon}) : null,
                        title ? span({className: 'xh-appbar-title', item: title}) : null,
                        appBarSeparator({omit: isEmpty(leftItems)}),
                        ...(leftItems ?? [])
                    ]
                }),
                navbarGroup({
                    align: 'right',
                    items: [
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
