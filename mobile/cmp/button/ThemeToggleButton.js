/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/mobile/cmp/button';

/**
 * Convenience Button preconfigured for use as a trigger for light/dark theme toggling.
 */
export const [ThemeToggleButton, themeToggleButton] = hoistCmp.withFactory({
    displayName: 'ThemeToggleButton',
    model: false,

    render({
        icon = XH.darkTheme ? Icon.sun({prefix: 'fas'}) : Icon.moon(),
        onClick = () => XH.toggleTheme(),
        ...props
    }) {
        return button(icon, onClick, ...props);
    }
});
ThemeToggleButton.propTypes = Button.propTypes;