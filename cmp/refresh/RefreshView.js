/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import PT from 'prop-types';
import {HoistComponent, elemFactory, LoadSupport, RefreshModel, RefreshContext} from '@xh/hoist/core';

const refreshContextProvider = elemFactory(RefreshContext.Provider);

@HoistComponent
@LoadSupport
/**
 * Establishes an area of the application with an independent RefreshModel.
 * All graphical children may access this RefreshModel via the RefreshContext.
 *
 * @see RefreshContext
 * @see RefreshModel
 */
export class RefreshView extends Component {

    static propTypes = {
        model: PT.instanceOf(RefreshModel).isRequired
    }

    static modelClass = RefreshModel;
   
    render() {
        return refreshContextProvider({
            value: this.model,
            items: this.props.children
        });
    }
}
export const refreshView = elemFactory(RefreshView);