/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import PT from 'prop-types';
import {div, span} from '@xh/hoist/cmp/layout';
import {FormContext, HoistInput} from '@xh/hoist/cmp/form';
import {label as labelCmp} from '@xh/hoist/mobile/cmp/form';
import {throwIf} from '@xh/hoist/utils/js';
import {isArray, isUndefined} from 'lodash';

import './FormField.scss';

/**
 * Standardised wrapper around a HoistInput Component.  FormField provides
 * consistent layout, labelling, and optional validation display for the input.
 *
 * FormField is often used within a Form component, and bound to a particular Field within
 * the related FormModel. In this case, FormField will display validation information for its
 * bound field, and may receive behavioral and visual defaults from its contained Field.
 */
@HoistComponent
export class FormField extends Component {

    static propTypes = {

        /** Name of bound property on Model. */
        field: PT.string,

        /**
         * Label for form field.
         * Defaults to Field displayName if used with @FormField. Set to null to hide label.
         */
        label: PT.string
    };

    baseClassName = 'xh-form-field';

    static contextType = FormContext;

    render() {
        const  {field: fieldName, label, ...rest} = this.props,
            {formModel} = this,
            field = formModel ? formModel.getField(fieldName) : null,
            isRequired = field && field.isRequired,
            isPending = field && field.isValidationPending,
            validationDisplayed = field && field.validationDisplayed,
            notValid = field && field.isNotValid,
            errors = field ? field.errors : [],
            labelStr = isUndefined(label) ? (field ? field.displayName : null) : label,
            requiredStr = isRequired ? span(' *') : null,
            item = this.prepareChild(),
            classes = [];

        if (isRequired) classes.push('xh-form-field-required');
        if (notValid) classes.push('xh-form-field-invalid');

        return div({
            className: this.getClassName(classes),
            items: [
                labelStr ? labelCmp(labelStr, requiredStr) : null,
                item,
                div({
                    omit: !isPending || !validationDisplayed,
                    className: 'xh-form-field-pending-msg',
                    item: 'Validating...'
                }),
                div({
                    omit: !notValid || !validationDisplayed,
                    className: 'xh-form-field-error-msg',
                    items: notValid ? errors[0] : null
                })
            ],
            ...rest
        });
    }

    //--------------------
    // Implementation
    //--------------------
    get formModel() {
        const form = this.context;
        return form ? form.model : null;
    }

    prepareChild() {
        const {field} = this.props,
            item = this.props.children;

        throwIf(isArray(item) || !(item.type.prototype instanceof HoistInput), 'FormField child must be a single component that extends HoistInput.');
        throwIf(item.props.field || item.props.model, 'HoistInputs should not declare "field" or "model" when used with FormField');

        return React.cloneElement(item, {model: this.formModel, field});
    }
}
export const formField = elemFactory(FormField);