/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import {box, div, filler, hbox, hspacer, p, vframe, viewport} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {button, logoutButton} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';
import './LockoutPanel.scss';

/**
 * Displayed in place of the UI when user does not have any access, as per AppSpec.checkAccess.
 *
 * @internal
 */
export const lockoutPanel = hoistCmp.factory({
    displayName: 'LockoutPanel',
    model: uses(AppContainerModel),

    render({model}) {
        return viewport(
            vframe(
                filler(),
                box({
                    className: 'xh-lockout-panel',
                    item: unauthorizedMessage()
                }),
                filler()
            )
        );
    }
});

const unauthorizedMessage = hoistCmp.factory<AppContainerModel>({
    render({model}) {
        const {identityService} = XH,
            {appSpec, appStateModel} = model,
            user = XH.getUser(),
            roleMsg = isEmpty(user.roles)
                ? 'no roles assigned'
                : `the roles [${user.roles.join(', ')}]`;

        return div(
            p(appStateModel.accessDeniedMessage ?? ''),
            p(`You are logged in as ${user.username} and have ${roleMsg}.`),
            p({
                item: appSpec.lockoutMessage,
                omit: !appSpec.lockoutMessage
            }),
            hbox(
                filler(),
                logoutButton({
                    text: 'Logout',
                    intent: null,
                    minimal: false
                }),
                hspacer(5),
                button({
                    omit: !identityService.isImpersonating,
                    icon: Icon.impersonate(),
                    text: 'End Impersonation',
                    minimal: false,
                    onClick: () => identityService.endImpersonateAsync()
                }),
                filler()
            )
        );
    }
});
