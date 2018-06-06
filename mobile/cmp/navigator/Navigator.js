/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {navigator as onsenNavigator} from '@xh/hoist/kit/onsen';

@HoistComponent()
export class Navigator extends Component {

    render() {
        const {initPage} = this.model;
        return onsenNavigator({
            initialRoute: initPage,
            animationOptions: {duration: 0.2, delay: 0, timing: 'ease-in'},
            renderPage: (page, navigator) => this.model.renderPage(page, navigator),
            onPostPush: () => this.model.doCallback(),
            onPostPop: () => this.model.doCallback()
        });
    }

}

export const navigator = elemFactory(Navigator);