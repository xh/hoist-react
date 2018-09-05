/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {navigator as onsenNavigator} from '@xh/hoist/kit/onsen';

@HoistComponent
export class Navigator extends Component {

    render() {
        const {initPageModel} = this.model;
        return onsenNavigator({
            initialRoute: initPageModel,
            animationOptions: {duration: 0.2, delay: 0, timing: 'ease-in'},
            renderPage: (pageModel, navigator) => this.model.renderPage(pageModel, navigator),
            onPostPush: () => this.model.onPageChange(),
            onPostPop: () => this.model.onPageChange()
        });
    }

}

export const navigator = elemFactory(Navigator);