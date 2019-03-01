/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import PT from 'prop-types';
import {isArray, isDate, isFinite, isBoolean, isUndefined} from 'lodash';

import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {box, div, span} from '@xh/hoist/cmp/layout';
import {FormContext} from '@xh/hoist/cmp/form';
import {HoistInput} from '@xh/hoist/cmp/input';
import {label as labelCmp} from '@xh/hoist/mobile/cmp/input';
import {fmtDate, fmtNumber} from '@xh/hoist/format';
import {throwIf, withDefault} from '@xh/hoist/utils/js';

import './FormField.scss';

/**
 * Standardised wrapper around a HoistInput Component. FormField provides consistent layout,
 * labelling, and optional display of validation messages for the input component.
 *
 * This component is typically used within a `Form` component and bound by name to a 'FieldModel'
 * within that Form's backing `FormModel`. FormField will setup the binding between its child
 * HoistInput and the FieldModel instance and can display validation messages, switch between
 * read-only and disabled variants of its child, and source default props via the parent Form's
 * `fieldDefaults` prop.
 *
 * FormFields can be sized and otherwise customized via standard @LayoutSupport props. They will
 * adjust their child Inputs to fill their available space (if appropriate given the input type),
 * so the recommended approach is to specify any sizing on the FormField (as opposed to the Input).
 */
@HoistComponent
@LayoutSupport
export class FormField extends Component {

    static propTypes = {

        /**
         * CommitOnChange property for underlying HoistInput (for inputs that support).
         * Defaulted from containing Form.
         */
        commitOnChange: PT.bool,

        /** Property name on bound FormModel from which to read/write data. */
        field: PT.string,

        /** Additional description or info to be displayed alongside the input control. */
        info: PT.node,

        /**
         * Label for form field. Defaults to Field displayName. Set to null to hide.
         * Can be defaulted from contained Form (specifically, to null to hide all labels).
         */
        label: PT.string,

        /**
         * Apply minimal styling - validation errors are only displayed with a red outline.
         * Defaulted from containing Form, or false.
         */
        minimal: PT.bool,

        /**
         * Optional function for use in readonly mode. Called with the Field's current value
         * and should return an element suitable for presentation to the end-user.
         */
        readonlyRenderer: PT.func

    };

    baseClassName = 'xh-form-field';

    static contextType = FormContext;

    render() {
        this.ensureConditions();

        const {info} = this.props;

        // Model related props
        const {fieldModel, label} = this,
            isRequired = fieldModel && fieldModel.isRequired,
            isPending = fieldModel && fieldModel.isValidationPending,
            readonly = fieldModel && fieldModel.readonly,
            validationDisplayed = fieldModel && fieldModel.validationDisplayed,
            notValid = fieldModel && fieldModel.isNotValid,
            displayNotValid = validationDisplayed && notValid,
            errors = fieldModel ? fieldModel.errors : [],
            requiredStr = isRequired ? span(' *') : null;

        // Display related props
        const minimal = this.getDefaultedProp('minimal', false);

        // Styles
        const classes = [];
        if (isRequired) classes.push('xh-form-field-required');
        if (minimal) classes.push('xh-form-field-minimal');
        if (readonly) classes.push('xh-form-field-readonly');
        if (displayNotValid) classes.push('xh-form-field-invalid');

        const control = this.prepareChild({readonly});

        return box({
            items: [
                labelCmp({
                    omit: !label,
                    className: 'xh-form-field-label',
                    items: [label, requiredStr]
                }),
                div({
                    className: this.childIsSizeable ? 'xh-form-field-fill' : '',
                    items: [
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
                    ]
                })
            ],
            className: this.getClassName(classes),
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
        return formModel ? formModel.fields[this.props.field] : null;
    }

    // Label can be provided via props, defaulted from form fieldDefaults ("null" being the expected
    // use case to hide all labels), or sourced from fieldModel displayName.
    get label() {
        const {fieldModel, form} = this;

        return withDefault(
            this.props.label,
            form ? form.fieldDefaults.label : undefined,
            fieldModel ? fieldModel.displayName : null
        );
    }

    get hasSize() {
        const {width, height, flex} = this.getLayoutProps();
        return width || height || flex;
    }

    get childIsSizeable() {
        const child = this.props.children;
        return child && child.type.isLayoutSupport;
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
            layoutProps = this.getLayoutProps(),
            item = this.props.children,
            {propTypes} = item.type;

        const overrides = {
            model: fieldModel,
            bind: 'value',
            disabled: fieldModel && fieldModel.disabled
        };

        // If FormField is sized and item doesn't specify its own dimensions,
        // the item should fill the available size of the FormField.
        // Note: We explicitly set width / height to null to override defaults.
        if (this.hasSize && this.childIsSizeable) {
            if (isUndefined(item.props.width) && isUndefined(item.props.flex)) {
                overrides.width = null;
            }

            if (isUndefined(item.props.height) && layoutProps.height) {
                overrides.height = null;
                overrides.flex = 1;
            }
        }

        const commitOnChange = this.getDefaultedProp('commitOnChange');
        if (propTypes.commitOnChange && !isUndefined(commitOnChange)) {
            overrides.commitOnChange = commitOnChange;
        }

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
        throwIf(child.props.bind || child.props.model, 'HoistInputs should not specify "bind" or "model" when used with FormField');
    }

}
export const formField = elemFactory(FormField);