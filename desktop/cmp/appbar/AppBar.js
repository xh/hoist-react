/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {span} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {appBarSeparator} from '@xh/hoist/desktop/cmp/appbar';
import {appMenuButton, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {navbar, navbarGroup} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import PT from 'prop-types';
import './AppBar.scss';

/**
 * A standard application navigation bar which displays the application name and a standard set of
 * buttons for common application actions. Application specific items can be displayed on the left
 * or right sides of the AppBar.
 *
 * The standard buttons which are visible will be based on user roles and application configuration,
 * or they can each be explicitly hidden.
 */
export const [AppBar, appBar] = hoistCmp.withFactory({
    displayName: 'AppBar',
    model: false,
    className: 'xh-appbar',

    render(props) {
        const {
            icon,
            leftItems,
            rightItems,
            hideRefreshButton,
            hideAppMenuButton,
            className,
            appMenuButtonProps = {},
            appMenuButtonPosition = 'right'
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
                        ...leftItems || []
                    ]
                }),
                navbarGroup({
                    align: 'right',
                    items: [
                        ...rightItems || [],
                        refreshButton({omit: hideRefreshButton}),
                        appMenuButton({
                            omit: hideAppMenuButton || appMenuButtonPosition != 'right',
                            ...appMenuButtonProps
                        })
                    ]
                })
            ]
        });
    }
});

AppBar.propTypes = {
    /** Position of the AppMenuButton. */
    appMenuButtonPosition: PT.oneOf(['left', 'right']),

    /** Allows overriding the default properties of the App Menu button. @see AppMenuButton */
    appMenuButtonProps: PT.object,

    /** True to hide the AppMenuButton. */
    hideAppMenuButton: PT.bool,

    /** True to hide the Refresh button. */
    hideRefreshButton: PT.bool,

    /** Icon to display to the left of the title. */
    icon: PT.element,

    /** Items to be added to the left side of the AppBar, immediately after the title (or . */
    leftItems: PT.node,

    /** Items to be added to the right side of the AppBar, before the standard buttons. */
    rightItems: PT.node,

    /** Title to display to the left side of the AppBar. Defaults to XH.clientAppName. */
    title: PT.string
};
