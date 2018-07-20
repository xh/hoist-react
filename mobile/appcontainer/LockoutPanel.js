/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {page} from '@xh/hoist/kit/onsen';
import {div, vspacer} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';

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
        return page(
            impersonationBar({model: this.model.impersonationBarManager}),
            div({
                cls: 'xh-lockout-panel',
                item: this.unauthorizedMessage()
            })
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
            button({
                icon: Icon.logout(),
                text: 'Logout',
                omit: !XH.app.enableLogout,
                onClick: () => {
                    XH.identityService.logoutAsync();
                }
            })
        );
    }
}

export const lockoutPanel = elemFactory(LockoutPanel);