/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory, RefreshSupport, RefreshContext} from '@xh/hoist/core';
import {RefreshModel} from './RefreshModel';

const refreshContextProvider = elemFactory(RefreshContext.Provider);

@HoistComponent
@RefreshSupport
export class RefreshView extends Component {

    static modelClass = RefreshModel;
   
    render() {
        return refreshContextProvider({
            value: this.model,
            items: this.props.children
        });
    }
}
export const refreshView = elemFactory(RefreshView);