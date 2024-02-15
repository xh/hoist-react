/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';

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

    render({icon = Icon.logout(), onClick = () => XH.identityService.logoutAsync(), ...props}) {
        if (XH.appSpec.isSSO) return null;
        return button({icon, onClick, ...props});
    }
});
