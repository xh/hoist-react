/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import PT from 'prop-types';
import {HoistComponent, elemFactory, LoadSupport} from '@xh/hoist/core';

import {BaseRefreshContextModel} from './BaseRefreshContextModel';
import {RefreshContext} from './RefreshContext';


const refreshContextProvider = elemFactory(RefreshContext.Provider);

/**
 * Establishes an area of the application with an independent RefreshContext and RefreshContextModel.
 *
 * The model established by this view will be refreshed by its parent context but may also be refreshed
 * independently.
 *
 * @see RefreshContext
 * @see RefreshContextModel
 */
@HoistComponent
@LoadSupport
export class RefreshContextView extends Component {

    static propTypes = {
        model: PT.instanceOf(BaseRefreshContextModel).isRequired
    };

    static modelClass = BaseRefreshContextModel;
   
    render() {
        return refreshContextProvider({
            value: this.model,
            items: this.props.children
        });
    }
}
export const refreshContextView = elemFactory(RefreshContextView);