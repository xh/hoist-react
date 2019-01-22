/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {RefreshModel} from './RefreshModel';
import {RefreshSupport} from './mixins/RefreshSupport';

export const RefreshContext = React.createContext(null);
const refreshContextProvider = elemFactory(RefreshContext.Provider);

@HoistComponent
@RefreshSupport
export class RefreshView extends Component {

    static modelClass = RefreshModel;
    static contextType = RefreshContext;

    render() {
        return refreshContextProvider({
            value: this.model,
            items: this.props.children
        });
    }
}
export const refreshView = elemFactory(RefreshView);