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
import {button} from '@xh/hoist/kit/blueprint';

/**
 * Convenience Button to open the admin client.
 * Visible only to users with the hoistAdmin application role.
 */
@HoistComponent()
export class LaunchAdminButton extends Component {

    static propTypes = {
        icon: PT.element,
        title: PT.string,
        onClick: PT.func
    };

    static baseCls = 'xh-launch-admin-button';

    render() {
        if (!XH.getUser().isHoistAdmin) return null;

        const {icon, title, onClick, ...rest} = this.props;
        return button({

            icon: icon || Icon.wrench(),
            title: title || 'Launch admin client...',
            onClick: onClick || this.onClick,
            ...rest
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    onClick = () => {
        window.open('/admin');
    }

}
export const launchAdminButton = elemFactory(LaunchAdminButton);