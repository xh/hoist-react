/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, refreshContextView} from '@xh/hoist/core';
import {TabModel} from '../TabModel';

/**
 * @private
 */
@HoistComponent
export class Tab extends Component {

    static modelClass = TabModel;

    render() {
        const {pageFactory, pageProps, refreshContextModel} = this.model;

        return refreshContextView({
            model: refreshContextModel,
            item: pageFactory({
                ...pageProps,
                tabModel: this.model
            })
        });
    }
}
export const tab = elemFactory(Tab);