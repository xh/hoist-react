/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {toolbarButton} from '@xh/hoist/kit/onsen';

@HoistComponent
export class NavigatorBackButton extends Component {

    render() {
        if (this.model.pages.length < 2) return null;
        return toolbarButton({
            item: Icon.chevronLeft(),
            onClick: () => XH.popRoute()
        });
    }

}

export const navigatorBackButton = elemFactory(NavigatorBackButton);