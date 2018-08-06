/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {div, box, filler, vframe, viewport, vspacer} from '@xh/hoist/cmp/layout';
import {logoutButton} from '@xh/hoist/desktop/cmp/button';

import './LockoutPanel.scss';
import {impersonationBar} from './ImpersonationBar';

/**
 * Panel for display to prevent user access to all content.
 *
 * @private
 */
@HoistComponent()
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
        const user = XH.getUser();

        return div(
            this.model.accessDeniedMessage,
            vspacer(10),
            `
                You are logged in as ${user.username} 
                and have the roles [${user.roles.join(', ') || '--'}].
            `,
            vspacer(20),
            logoutButton({
                text: 'Logout',
                omit: !XH.app.enableLogout
            })
        );
    }
}

export const lockoutPanel = elemFactory(LockoutPanel);