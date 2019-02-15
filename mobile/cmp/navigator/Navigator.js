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

import './Navigator.scss';

/**
 * Top-level Component within an application, responsible for rendering pages and managing
 * transitions between pages.
 */
@HoistComponent
export class Navigator extends Component {

    static modelClass = NavigatorModel;

    baseClassName = 'xh-navigator';
    
    render() {
        const {model} = this;

        return onsenNavigator({
            className: this.getClassName(),
            initialRoute: {init: true},
            animationOptions: {duration: 0.2, delay: 0, timing: 'ease-in'},
            renderPage: (pageModel, navigator) => model.renderPage(pageModel, navigator),
            onPostPush: () => model.onPageChange(),
            onPostPop: () => model.onPageChange()
        });
    }

}

export const navigator = elemFactory(Navigator);