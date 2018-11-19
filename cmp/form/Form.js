/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import PT from 'prop-types';
import box from '@xh/hoist/layout';

export const FormContext = React.createContext(null);
const formContextProvider = elemFactory(FormContext.Provider);

/**
 * A container for structured user input.
 *
 * Co-ordinates the binding of contained FormFields to a FormModel.
 */
@HoistComponent
@LayoutSupport
export class Form extends Component {

    static propTypes = {

        /**
         * Default props for contained FormFields.
         */
        fieldDefaults: PT.boolean
    }


    render() {
        return box({
            ...this.getLayoutProps(),
            item: formContextProvider({
                value: this,
                items: this.props.children
            })
        });
    }
}
export const form = elemFactory(Form);