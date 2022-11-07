/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {BoxProps, DefaultHoistProps, simpleElementFactory, hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import equal from 'fast-deep-equal';
import {createContext, useContext} from 'react';
import {useCached} from '@xh/hoist/utils/react';
import {FormModel} from './FormModel';
import {BaseFormFieldProps} from './BaseFormFieldProps';

/** @internal */
export interface FormContextType {
    /** Defaults props to be applied to contained fields. */
    fieldDefaults?: Partial<BaseFormFieldProps> & DefaultHoistProps;

    /** Reference to associated FormModel. */
    model?: FormModel;
}

/** @internal */
export const FormContext = createContext<FormContextType>({});
const formContextProvider = simpleElementFactory(FormContext.Provider);


export interface FormProps extends HoistProps<FormModel>, BoxProps {
    /**
     * Defaults for certain props on child/nested FormFields.
     * @see FormField (note there are both desktop and mobile implementations).
     */
    fieldDefaults?: Partial<BaseFormFieldProps> & DefaultHoistProps;
}

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
export const [Form, form] = hoistCmp.withFactory<FormProps>({
    displayName: 'Form',
    model: uses(FormModel, {publishMode:  'none'}),

    render({model, fieldDefaults = {}, children}) {
        // gather own and inherited field defaults...
        const parentDefaults = useContext(FormContext).fieldDefaults;
        if (parentDefaults) fieldDefaults = {...parentDefaults, ...fieldDefaults};

        // ...and deliver as a cached context to avoid spurious re-renders
        const formContext = useCached(
            {model, fieldDefaults},
            (a, b) => a.model === b.model && equal(a.fieldDefaults, b.fieldDefaults)
        );
        return formContextProvider({value: formContext, items: children});
    }
});
