/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {backButton} from '@xh/hoist/kit/onsen';

@HoistComponent()
export class NavigatorBackButton extends Component {

    render() {
        const {model, callback} = this.props;
        if (model.pages.length < 2) return null;
        return backButton({
            onClick: () => model.popPage(callback)
        });
    }

}

export const navigatorBackButton = elemFactory(NavigatorBackButton);