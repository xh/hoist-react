/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
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
export class RefreshContextView extends Component {

    static contextType = RefreshContext;

    render() {
        return refreshContextProvider({
            value: this.model,
            items: this.props.children
        });
    }

    componentDidMount() {
        const {context, model} = this;
        if (context && model) context.register(model);
    }

    componentWillUnmount() {
        const {context, model} = this;
        if (context && model) context.unregister(model);
    }
}
export const refreshContextView = elemFactory(RefreshContextView);