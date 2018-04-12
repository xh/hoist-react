/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {XH, elemFactory, hoistComponent} from 'hoist/core';
import {Icon} from 'hoist/icon';
import {button} from 'hoist/kit/blueprint';

/**
 * Convenience Button preconfigured for use as a trigger for a logout operation.
 * Accepts props documented below as well as any others supported by Blueprint's Button.
 *
 * Must be provided the appModel to determine if logout is enabled for the application.
 * An onClick handler can be provided to implement additional operations on logout
 * If onClick handler is provided it should call XH.identityService.logoutAsync();
 */
@hoistComponent()
export class LogoutButton extends Component {

    static propTypes = {
        icon: PT.element,
        intent: PT.string,
        onClick: PT.func,
        model: PT.object
    };

    render() {
        const {icon, intent, onClick, model, ...rest} = this.props;
        return button({
            icon: icon || Icon.logout(),
            intent: intent || 'danger',
            onClick: onClick || this.onLogoutClick,
            omit: !model.enableLogout,
            ...rest
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    onLogoutClick = () => {
        XH.identityService.logoutAsync();
    }

}
export const logoutButton = elemFactory(LogoutButton);