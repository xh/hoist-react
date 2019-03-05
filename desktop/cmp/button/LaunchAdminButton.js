/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/desktop/cmp/button';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * Convenience Button to open the admin client.
 * Visible only to users with the hoistAdmin application role.
 */
@HoistComponent
export class LaunchAdminButton extends Component {

    static propTypes = {
        ...Button.propTypes
    };

    render() {
        if (!XH.getUser().isHoistAdmin) return null;

        const {icon, title, onClick, ...rest} = this.props;
        return button({
            icon: withDefault(icon, Icon.wrench()),
            title: withDefault(title, 'Launch admin client...'),
            onClick: withDefault(onClick, this.launchAdminClient),
            ...rest
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    launchAdminClient = () => {
        window.open('/admin');
    }

}
export const launchAdminButton = elemFactory(LaunchAdminButton);