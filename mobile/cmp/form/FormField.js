/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import PT from 'prop-types';
import {isArray, isDate, isFinite, isBoolean} from 'lodash';

import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {div, span} from '@xh/hoist/cmp/layout';
import {FormContext, HoistInput} from '@xh/hoist/cmp/form';
import {label as labelCmp} from '@xh/hoist/mobile/cmp/form';
import {fmtDate, fmtNumber} from '@xh/hoist/format';
import {throwIf, withDefault} from '@xh/hoist/utils/js';

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
@LayoutSupport
export class FormField extends Component {

    static propTypes = {

        /** Property name on bound FormModel from which to read/write data. */
        field: PT.string,

        /**
         * Label for form field.
         *
         * Defaults to Field displayName. Set to null to hide label.
         */
        label: PT.string,

        /**
         * Additional metadata or description to be displayed with control
         */
        info: PT.node,

        /**
         * Optional function for use in readonly mode.
         * Receives (value), and should return a human-readable string.
         */
        readonlyRenderer: PT.func,

        //----------------------
        // -- Default from Form
        //----------------------
        /**
         * Apply minimal styling - validation errors are only displayed with a red outline.
         *
         * Defaulted from containing Form, or false.
         */
        minimal: PT.bool,

        /**
         * Render the bound value as a string rather than the HoistInput
         *
         * Defaulted from containing Form, or false.
         */
        readonly: PT.bool
    };

    baseClassName = 'xh-form-field';

    static contextType = FormContext;

    render() {
        this.ensureConditions();

        const {label, info} = this.props;

        // Model related props
        const {fieldModel} = this,
            isRequired = fieldModel && fieldModel.isRequired,
            isPending = fieldModel && fieldModel.isValidationPending,
            validationDisplayed = fieldModel && fieldModel.validationDisplayed,
            notValid = fieldModel && fieldModel.isNotValid,
            displayNotValid = validationDisplayed && notValid,
            errors = fieldModel ? fieldModel.errors : [],
            labelStr = withDefault(label, (fieldModel ? fieldModel.displayName : null)),
            requiredStr = isRequired ? span(' *') : null;

        // Display related props
        const minimal = this.getDefaultedProp('minimal', false),
            readonly = this.getDefaultedProp('readonly', false);

        // Styles
        const classes = [];
        if (isRequired) classes.push('xh-form-field-required');
        if (minimal) classes.push('xh-form-field-minimal');
        if (readonly) classes.push('xh-form-field-readonly');
        if (displayNotValid) classes.push('xh-form-field-invalid');

        const control = this.prepareChild({readonly});

        return div({
            className: this.getClassName(classes),
            items: [
                labelCmp({
                    omit: !labelStr,
                    className: 'xh-form-field-label',
                    items: [labelStr, requiredStr]}
                ),
                control,
                div({
                    omit: !info,
                    className: 'xh-form-field-info',
                    item: info
                }),
                div({
                    omit: minimal || !isPending || !validationDisplayed,
                    className: 'xh-form-field-pending-msg',
                    item: 'Validating...'
                }),
                div({
                    omit: minimal || !displayNotValid,
                    className: 'xh-form-field-error-msg',
                    items: notValid ? errors[0] : null
                })
            ],
            ...this.getLayoutProps()
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
        return formModel ? formModel.getField(this.props.field) : null;
    }

    getDefaultedProp(name, defaultVal) {
        const {form} = this;
        return withDefault(
            this.props[name],
            form ? form.fieldDefaults[name] : undefined,
            defaultVal
        );
    }

    prepareChild({readonly}) {
        const {fieldModel} = this,
            item = this.props.children;

        const overrides = {
            model: fieldModel,
            field: 'value',
            disabled: fieldModel && fieldModel.disabled
        };

        return readonly ? this.renderReadonly() : React.cloneElement(item, overrides);
    }

    renderReadonly() {
        const {fieldModel} = this,
            value = fieldModel ? fieldModel['value'] : null,
            renderer = withDefault(this.props.readonlyRenderer, this.defaultReadonlyRenderer);

        return span({
            className: 'xh-form-field-readonly-display',
            item: renderer(value)
        });
    }

    defaultReadonlyRenderer(value) {
        if (isDate(value)) return fmtDate(value);
        if (isFinite(value)) return fmtNumber(value);
        if (isBoolean(value)) return value.toString();
        return value;
    }

    ensureConditions() {
        const child = this.props.children;
        throwIf(!child || isArray(child) || !(child.type.prototype instanceof HoistInput), 'FormField child must be a single component that extends HoistInput.');
        throwIf(child.props.field || child.props.model, 'HoistInputs should not specify "field" or "model" when used with FormField');
    }

}
export const formField = elemFactory(FormField);