/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {navigator as onsenNavigator} from '@xh/hoist/kit/onsen';
import {NavigatorModel} from './NavigatorModel';

@HoistComponent
export class Navigator extends Component {

    static modelClass = NavigatorModel;
    
    render() {
        const {model} = this,
            {initPageModel} = model;
        return onsenNavigator({
            initialRoute: initPageModel,
            animationOptions: {duration: 0.2, delay: 0, timing: 'ease-in'},
            renderPage: (pageModel, navigator) => model.renderPage(pageModel, navigator),
            onPostPush: () => model.onPageChange(),
            onPostPop: () => model.onPageChange()
        });
    }

}

export const navigator = elemFactory(Navigator);