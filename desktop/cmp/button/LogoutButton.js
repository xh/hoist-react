/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/desktop/cmp/button';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * Convenience Button preconfigured for use as a trigger for a logout operation.
 *
 * An onClick handler can be provided to implement additional operations on logout,
 * but should ensure it calls `XH.identityService.logoutAsync()`.
 */
@HoistComponent
export class LogoutButton extends Component {

    static propTypes = {
        ...Button.propTypes
    };

    render() {
        if (XH.appSpec.isSSO) return null;

        const {icon, title, intent, onClick, ...rest} = this.props;
        return button({
            icon: withDefault(icon, Icon.logout()),
            title: withDefault(title, 'Logout'),
            intent: withDefault(intent, 'danger'),
            onClick: withDefault(onClick, this.logout),
            ...rest
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    logout = () => {
        XH.identityService.logoutAsync();
    }

}
export const logoutButton = elemFactory(LogoutButton);