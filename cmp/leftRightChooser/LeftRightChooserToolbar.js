/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {toolbar} from 'hoist/cmp';
import {button} from 'hoist/kit/blueprint';
import {Icon} from 'hoist/icon';

/**
 * A Toolbar that contains controllers (buttons) for the LeftRightChooser
 */

@hoistComponent()
class LeftRightChooserToolbar extends Component {
    render() {
        return toolbar({
            width: 50,
            vertical: true,
            items: [
                button({
                    icon: Icon.chevronRight()
                }),
                button({
                    icon: Icon.chevronLeft()
                })
            ]
        });
    }
}

export const leftRightChooserToolbar = elemFactory(LeftRightChooserToolbar);
