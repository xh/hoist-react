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
 * Convenience Button to open the admin client.
 * Visible only to users with the hoistAdmin application role.
 */
@hoistComponent()
export class LaunchAdminButton extends Component {

    static propTypes = {
        icon: PT.element,
        title: PT.string,
        onClick: PT.func
    };

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