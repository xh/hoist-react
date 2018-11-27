/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {toolbarButton} from '@xh/hoist/kit/onsen';

/**
 * Convenience Button preconfigured for use as a trigger for light/dark theme toggling.
 */
@HoistComponent
export class ThemeToggleButton extends Component {

    render() {
        return toolbarButton({
            item: XH.darkTheme ? Icon.sun({prefix: 'fas'}) : Icon.moon(),
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