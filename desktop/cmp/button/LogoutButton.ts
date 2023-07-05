/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from './Button';

export type LogoutButtonProps = ButtonProps;

/**
 * Convenience Button preconfigured for use as a trigger for a logout operation.
 *
 * An onClick handler can be provided to implement additional operations on logout,
 * but should ensure it calls `XH.identityService.logoutAsync()`.
 */
export const [LogoutButton, logoutButton] = hoistCmp.withFactory<LogoutButtonProps>({
    displayName: 'LogoutButton',
    model: false,

    render(props, ref) {
        if (XH.appSpec.isSSO) return null;
        return button({
            ref,
            icon: Icon.logout(),
            title: 'Logout',
            intent: 'danger',
            onClick: () => XH.identityService.logoutAsync(),
            ...props
        });
    }
});
