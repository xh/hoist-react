/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {defaults} from 'lodash';
import {FormModel} from './FormModel';
import PT from 'prop-types';

export const FormContext = React.createContext(null);
const formContextProvider = elemFactory(FormContext.Provider);

/**
 * Wrapper component for a data-input form. This is the top-level entry point (along with its model
 * class, FormModel) for building a form of arbitrary complexity with support for data binding,
 * default / initial values, client-side validation rules, and nested sub-forms.
 *
 * This container accepts any manner of child components for layout or other purposes, but is
 * primarily designed to apply defaults to and manage data binding for FormField components, which
 * can be nested at any level below this parent component.
 *
 * @see FormModel - top-level model for Hoist form support, which holds a collection of...
 * @see FieldModel - field-level model, which manages field-level specs/data to be rendered by a...
 * @see FormField - field-level wrapper component, which labels and displays info for a...
 * @see HoistInput - superclass for the data entry components themselves.
 */
@HoistComponent
export class Form extends Component {

    static modelClass = FormModel;
    static contextType = FormContext;

    static propTypes = {
        /**
         * Defaults for certain props on child/nested FormFields.
         * @see FormField (note there are both desktop and mobile implementations).
         */
        fieldDefaults: PT.object,


        /** Primary component model instance. */
        model: PT.oneOfType([PT.instanceOf(FormModel), PT.object])
    };

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