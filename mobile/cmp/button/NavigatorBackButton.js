/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';

@HoistComponent
export class NavigatorBackButton extends Component {

    render() {
        if (this.model.pages.length < 2) return null;
        return button({
            icon: Icon.chevronLeft(),
            onClick: () => XH.popRoute(),
            ...this.props
        });
    }

}

export const navigatorBackButton = elemFactory(NavigatorBackButton);