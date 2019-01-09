/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {defaults} from 'lodash';
import {FormModel} from './FormModel';
import PT from 'prop-types';

export const FormContext = React.createContext(null);
const formContextProvider = elemFactory(FormContext.Provider);

/**
 * A container for structured user input.
 *
 * Co-ordinates the binding of contained FormFields to a FormModel.
 */
@HoistComponent
export class Form extends Component {

    static modelClass = FormModel;

    static contextType = FormContext;

    static propTypes = {

        /**
         * Defaults for certain props on contained FormFields.
         * See FormField.
         */
        fieldDefaults: PT.object
    }

    render() {
        return formContextProvider({
            value: this,
            items: this.props.children
        });
    }

    get fieldDefaults() {
        const {parentForm} = this,
            parentDefaults = parentForm ? parentForm.fieldDefaults : null,
            myDefaults = this.props.fieldDefaults;

        return defaults({}, myDefaults, parentDefaults);
    }


    get parentForm() {
        return this.context;
    }
}
export const form = elemFactory(Form);