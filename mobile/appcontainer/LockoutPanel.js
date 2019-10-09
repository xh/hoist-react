/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH, hoistCmp} from '@xh/hoist/core';
import {page} from '@xh/hoist/kit/onsen';
import {div, vspacer} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';

import './LockoutPanel.scss';

/**
 * Panel for display to prevent user access to all content.
 *
 * @private
 */
export const lockoutPanel = hoistCmp.factory({
    displayName: 'LockoutPanel',
    render({model}) {
        const user = XH.getUser(),
            {appSpec, identityService} = XH;

        return page(
            div({
                className: 'xh-lockout-panel',
                item: div(
                    XH.accessDeniedMessage ?? '',
                    vspacer(10),
                    `You are logged in as ${user.username} and have the roles [${user.roles.join(', ') || '--'}].`,
                    vspacer(10),
                    appSpec.lockoutMessage,
                    vspacer(20),
                    button({
                        icon: Icon.logout(),
                        text: 'Logout',
                        omit: appSpec.isSSO,
                        onClick: () => identityService.logoutAsync()
                    }),
                    vspacer(10),
                    button({
                        icon: Icon.impersonate(),
                        text: 'End Impersonation',
                        omit: !identityService.isImpersonating,
                        onClick: () => identityService.endImpersonateAsync()
                    })
                )
            })
        );
    }
});