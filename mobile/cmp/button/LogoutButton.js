/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {toolbarButton} from '@xh/hoist/kit/onsen';

/**
 * Convenience Button preconfigured for use as a trigger for a logout operation.
 * Accepts props documented below as well as any others supported by Blueprint's Button.
 *
 * An onClick handler can be provided to implement additional operations on logout,
 * but should ensure it calls `XH.identityService.logoutAsync()`.
 */
@HoistComponent()
export class LogoutButton extends Component {

    static propTypes = {
        icon: PT.element,
        onClick: PT.func
    };

    render() {
        if (!XH.appModel.enableLogout) return null;

        const {icon, onClick, ...rest} = this.props;
        return toolbarButton({
            item: icon || Icon.logout(),
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