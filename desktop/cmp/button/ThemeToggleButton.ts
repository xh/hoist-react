/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from './Button';

export type ThemeToggleButtonProps = ButtonProps;

/**
 * Convenience Button preconfigured for use as a trigger for light/dark theme toggling.
 */
export const [ThemeToggleButton, themeToggleButton] = hoistCmp.withFactory<ThemeToggleButtonProps>({
    displayName: 'ThemeToggleButton',
    model: false,

    render(props, ref) {
        return button({
            ref,
            icon: XH.darkTheme ? Icon.sun({prefix: 'fas'}) : Icon.moon(),
            title: XH.darkTheme ? 'Switch to light theme' : 'Switch to dark theme',
            onClick: () => XH.toggleTheme(),
            ...props
        });
    }
});
