/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    DefaultHoistProps,
    elementFactory,
    hoistCmp,
    HoistProps,
    TestSupportProps,
    uses
} from '@xh/hoist/core';
import {useCached} from '@xh/hoist/utils/react';
import equal from 'fast-deep-equal';
import {createContext, useContext} from 'react';
import {BaseFormFieldProps} from './BaseFormFieldProps';
import {FormModel} from './FormModel';

/** @internal */
export interface FormContextType {
    /** Defaults props to be applied to contained fields. */
    fieldDefaults?: Partial<BaseFormFieldProps> & DefaultHoistProps;

    /** Reference to associated FormModel. */
    model?: FormModel;

    /**
     *  Not rendered into the DOM directly - `Form` is a context provider and not a concrete
     *  component - but will auto-generate and apply a testId of `${formTestId}-${fieldName}`
     *  for every child {@link FormField} component, providing a centralized way to wire up
     *  a form and all of its fields for testing.
     */
    testId?: string;
}

/** @internal */
export const FormContext = createContext<FormContextType>({});
const formContextProvider = elementFactory(FormContext.Provider);

export interface FormProps extends HoistProps<FormModel>, TestSupportProps {
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
    model: uses(FormModel, {publishMode: 'none'}),

    render({model, fieldDefaults = {}, testId, children}) {
        // gather own and inherited field defaults...
        const parentDefaults = useContext(FormContext).fieldDefaults;
        if (parentDefaults) fieldDefaults = {...parentDefaults, ...fieldDefaults};

        // ...and deliver as a cached context to avoid spurious re-renders
        const formContext = useCached(
            {
                model,
                fieldDefaults,
                testId
            },
            (a, b) => a.model === b.model && equal(a.fieldDefaults, b.fieldDefaults)
        );
        return formContextProvider({value: formContext, items: children});
    }
});
