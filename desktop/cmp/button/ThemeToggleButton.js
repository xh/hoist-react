/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/desktop/cmp/button';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * Convenience Button preconfigured for use as a trigger for light/dark theme toggling.
 */
@HoistComponent
export class ThemeToggleButton extends Component {

    static propTypes = {
        ...Button.propTypes
    }

    render() {
        const {icon, title, onClick, ...rest} = this.props;
        return button({
            icon: withDefault(icon, XH.darkTheme ? Icon.sun({prefix: 'fas'}) : Icon.moon()),
            title: withDefault(title, XH.darkTheme ? 'Switch to light theme' : 'Switch to dark theme'),
            onClick: withDefault(onClick, this.toggleTheme),
            ...rest
        });
    }

    //------------------------
    // Implementation
    //------------------------
    toggleTheme = () => {
        XH.toggleTheme();
    }

}
export const themeToggleButton = elemFactory(ThemeToggleButton);