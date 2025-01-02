/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';

export type LaunchAdminButtonProps = ButtonProps;

/**
 * Convenience Button to open the admin client.
 * Visible only to users with the hoistAdmin application role.
 */
export const [LaunchAdminButton, launchAdminButton] = hoistCmp.withFactory<LaunchAdminButtonProps>({
    displayName: 'LaunchAdminButton',
    model: false,

    render(props, ref) {
        if (!XH.getUser().isHoistAdminReader) return null;
        return button({
            ref,
            icon: Icon.wrench(),
            title: 'Launch admin client...',
            onClick: () => window.open('/admin'),
            ...props
        });
    }
});
