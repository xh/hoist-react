/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory, hoistComponent, hoistModel} from 'hoist/core';
import {Icon} from 'hoist/icon';
import {button, hotkeys, hotkey} from 'hoist/kit/blueprint';

/**
 * Convenience Button preconfigured for use as a trigger for light/dark theme toggling.
 * Theme can also be toggled via a global Shift+t keyboard shortcut.
 */
@hoistComponent()
export class ThemeToggleButton extends Component {

    renderHotkeys() {
        return hotkeys(
            hotkey({
                global: true,
                combo: 'shift + t',
                label: 'Toggle Theme',
                onKeyDown: this.onThemeToggleClick
            })
        );
    }

    render() {
        return button({
            icon: this.darkTheme ? Icon.sun() : Icon.moon(),
            onClick: this.onThemeToggleClick
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    onThemeToggleClick = () => {
        hoistModel.toggleTheme();
    }
}
export const themeToggleButton = elemFactory(ThemeToggleButton);