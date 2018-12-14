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
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {isArray} from 'lodash';

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
        this.ensureConditions();

        const {label, ...rest} = this.props;

        const {fieldModel} = this,
            isRequired = fieldModel && fieldModel.isRequired,
            isPending = fieldModel && fieldModel.isValidationPending,
            validationDisplayed = fieldModel && fieldModel.validationDisplayed,
            notValid = fieldModel && fieldModel.isNotValid,
            errors = fieldModel ? fieldModel.errors : [],
            labelStr = withDefault(label, (fieldModel ? fieldModel.displayName : null)),
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
    get form() {
        return this.context;
    }

    get formModel() {
        const {form} = this;
        return form ? form.model : null;
    }

    get fieldModel() {
        const {formModel} = this;
        formModel ? formModel.getField(this.props.field) : null;
    }

    prepareChild() {
        const {fieldModel} = this,
            item = this.props.children;

        return React.cloneElement(item, {
            model: fieldModel,
            field: 'value',
            disabled: fieldModel && fieldModel.disabled
        });
    }

    ensureConditions() {
        const child = this.props.children;
        throwIf(!child || isArray(child) || !(child.type.prototype instanceof HoistInput), 'FormField child must be a single component that extends HoistInput.');
        throwIf(child.props.field || child.props.model, 'HoistInputs should not specify "field" or "model" when used with FormField');
    }

}
export const formField = elemFactory(FormField);