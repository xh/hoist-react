/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';

/**
 * Convenience Button preconfigured for use as a trigger for a logout operation.
 *
 * An onClick handler can be provided to implement additional operations on logout,
 * but should ensure it calls `XH.identityService.logoutAsync()`.
 */
@HoistComponent
export class LogoutButton extends Component {

    static propTypes = {
        icon: PT.element,
        onClick: PT.func
    };

    render() {
        if (XH.appSpec.isSSO) return null;

        const {icon, onClick, ...rest} = this.props;
        return button({
            icon: icon || Icon.logout(),
            onClick: onClick || this.onClick,
            ...rest
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    onClick = () => {
        XH.identityService.logoutAsync();
    }

}

export const logoutButton = elemFactory(LogoutButton);