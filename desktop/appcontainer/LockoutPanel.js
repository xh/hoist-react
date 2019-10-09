/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {isEmpty} from 'lodash';
import {Icon} from '@xh/hoist/icon';
import {XH, hoistCmp, uses} from '@xh/hoist/core';
import {box, hbox, filler, vframe, viewport, p, hspacer, div} from '@xh/hoist/cmp/layout';
import {logoutButton, button} from '@xh/hoist/desktop/cmp/button';

import './LockoutPanel.scss';
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';

/**
 * Displayed in place of the UI when user does not have any access, as per AppSpec.checkAccess.
 *
 * @private
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

function unauthorizedMessage() {
    const {appSpec, identityService} = XH,
        user = XH.getUser(),
        roleMsg = isEmpty(user.roles) ? 'no roles assigned' : `the roles [${user.roles.join(', ')}]`;

    return div(
        p(XH.accessDeniedMessage ?? ''),
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