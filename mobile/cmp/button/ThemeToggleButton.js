/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH, hoistCmp} from '@xh/hoist/core';
import {button, Button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';

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