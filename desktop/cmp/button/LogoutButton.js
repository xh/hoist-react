/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, hoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from './Button';

/**
 * Convenience Button preconfigured for use as a trigger for a logout operation.
 *
 * An onClick handler can be provided to implement additional operations on logout,
 * but should ensure it calls `XH.identityService.logoutAsync()`.
 */
export const LogoutButton = hoistComponent({
    displayName: 'LogoutButton',
    render(props)  {
        if (XH.appSpec.isSSO) return null;
        return button({
            icon: Icon.logout(),
            title: 'Logout',
            intent: 'danger',
            onClick: () => XH.identityService.logoutAsync(),
            ...props
        });
    }
});
LogoutButton.propTypes = {...Button.propTypes};

export const logoutButton = elemFactory(LogoutButton);
