/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, HotkeysTarget, hotkeys, hotkey} from '@xh/hoist/kit/blueprint';

/**
 * Convenience Button preconfigured for use as a trigger for light/dark theme toggling.
 * Theme can also be toggled via a global Shift+t keyboard shortcut.
 */
@HoistComponent
@HotkeysTarget
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
            icon: XH.darkTheme ? Icon.sun() : Icon.moon(),
            title: XH.darkTheme ? 'Switch to light theme' : 'Switch to dark theme',
            onClick: this.onThemeToggleClick
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    onThemeToggleClick = () => {
        XH.toggleTheme();
    }
}
export const themeToggleButton = elemFactory(ThemeToggleButton);