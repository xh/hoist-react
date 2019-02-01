/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import PT from 'prop-types';
import {HoistComponent, elemFactory, LoadSupport, RefreshContextModel, RefreshContext} from '@xh/hoist/core';

const refreshContextProvider = elemFactory(RefreshContext.Provider);

/**
 * Establishes an area of the application with an independent RefreshContext and RefreshContextModel.
 *
 * The model established by this view will be refreshed by its parent context, but also may be refreshed
 * independently.
 *
 * @see RefreshContext
 * @see RefreshContextModel
 */
@HoistComponent
@LoadSupport
export class RefreshView extends Component {

    static propTypes = {
        model: PT.instanceOf(RefreshContextModel).isRequired
    }

    static modelClass = RefreshContextModel;
   
    render() {
        return refreshContextProvider({
            value: this.model,
            items: this.props.children
        });
    }
}
export const refreshContextView = elemFactory(RefreshView);