/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import {div, vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {page} from '@xh/hoist/kit/onsen';
import {button} from '@xh/hoist/mobile/cmp/button';
import './LockoutPanel.scss';

/**
 * Panel for display to prevent user access to all content.
 *
 * @internal
 */
export const lockoutPanel = hoistCmp.factory<AppContainerModel>({
    displayName: 'LockoutPanel',
    render({model}) {
        const user = XH.getUser(),
            {appSpec, appStateModel} = model,
            {identityService} = XH;

        return page(
            div({
                className: 'xh-lockout-panel',
                item: div(
                    appStateModel.accessDeniedMessage ?? '',
                    vspacer(10),
                    `You are logged in as ${user.username} and have the roles [${
                        user.roles.join(', ') || '--'
                    }].`,
                    vspacer(10),
                    appSpec.lockoutMessage,
                    vspacer(20),
                    button({
                        icon: Icon.logout(),
                        text: 'Logout',
                        omit: !appSpec.enableLogout,
                        onClick: () => XH.logoutAsync()
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
