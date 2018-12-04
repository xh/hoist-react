/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/desktop/cmp/button';

/**
 * Convenience Button preconfigured for use as a trigger for light/dark theme toggling.
 */
@HoistComponent
export class ThemeToggleButton extends Component {

    render() {
        return button({
            icon: XH.darkTheme ? Icon.sun({prefix: 'fas'}) : Icon.moon(),
            title: XH.darkTheme ? 'Switch to light theme' : 'Switch to dark theme',
            onClick: this.onThemeToggleClick
        });
    }

    onThemeToggleClick = () => {
        XH.toggleTheme();
    }
}
export const themeToggleButton = elemFactory(ThemeToggleButton);