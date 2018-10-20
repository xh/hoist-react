/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {isEmpty} from 'lodash';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {div, box, filler, vframe, viewport} from '@xh/hoist/cmp/layout';
import {logoutButton} from '@xh/hoist/desktop/cmp/button';

import './LockoutPanel.scss';
import {impersonationBar} from './ImpersonationBar';

/**
 * Displayed in place of the UI when user does not have any access, as per AppSpec.checkAccess.
 *
 * @private
 */
@HoistComponent
export class LockoutPanel extends Component {

    render() {
        return viewport(
            vframe(
                impersonationBar({model: this.model.impersonationBarModel}),
                filler(),
                box({
                    className: 'xh-lockout-panel',
                    item: this.unauthorizedMessage()
                }),
                filler()
            )
        );
    }

    unauthorizedMessage() {
        const user = XH.getUser(),
            roleMsg = isEmpty(user.roles) ?
                'no roles assigned' :
                `the roles [${user.roles.join(', ')}]`;

        return div(
            this.model.accessDeniedMessage,
            box({
                margin: '10 0 20 0',
                item: `You are logged in as ${user.username} and have ${roleMsg}.`
            }),
            logoutButton({
                text: 'Logout',
                omit: XH.appSpec.isSSO
            })
        );
    }
}

export const lockoutPanel = elemFactory(LockoutPanel);