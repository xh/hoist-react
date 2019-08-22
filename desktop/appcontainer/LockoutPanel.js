/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {isEmpty} from 'lodash';
import {XH, hoistElemFactory, useProvidedModel} from '@xh/hoist/core';
import {div, box, filler, vframe, viewport, p} from '@xh/hoist/cmp/layout';
import {logoutButton} from '@xh/hoist/desktop/cmp/button';

import './LockoutPanel.scss';
import {impersonationBar} from './ImpersonationBar';
import {AppContainerModel} from '@xh/hoist/core/appcontainer/AppContainerModel';

/**
 * Displayed in place of the UI when user does not have any access, as per AppSpec.checkAccess.
 *
 * @private
 */
export const lockoutPanel = hoistElemFactory(
    props => {
        const model = useProvidedModel(AppContainerModel, props);
        return viewport(
            vframe(
                impersonationBar({model: model.impersonationBarModel}),
                filler(),
                box({
                    className: 'xh-lockout-panel',
                    item: unauthorizedMessage(model.accessDeniedMessage)
                }),
                filler()
            )
        );
    }
);

function unauthorizedMessage(msg) {
    const {appSpec} = XH,
        user = XH.getUser(),
        roleMsg = isEmpty(user.roles) ? 'no roles assigned' : `the roles [${user.roles.join(', ')}]`;

    return div(
        p(msg),
        p(`You are logged in as ${user.username} and have ${roleMsg}.`),
        p({
            item: appSpec.lockoutMessage,
            omit: !appSpec.lockoutMessage
        }),
        logoutButton({
            text: 'Logout',
            omit: appSpec.isSSO
        })
    );
}