/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';

export const FormContext = React.createContext(null);
const formContextProvider = elemFactory(FormContext.Provider);

/**
 * A container for HoistInput fields bound to a FormModel.
 */
@HoistComponent
export class Form extends Component {

    render() {
        return formContextProvider({
            value: this,
            items: this.props.children
        });
    }
}
export const form = elemFactory(Form);