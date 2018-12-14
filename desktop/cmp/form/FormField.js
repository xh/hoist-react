/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import PT from 'prop-types';
import {isArray, isUndefined} from 'lodash';

import {elemFactory, HoistComponent, StableIdSupport} from '@xh/hoist/core';
import {formGroup, spinner, tooltip} from '@xh/hoist/kit/blueprint';
import {HoistInput, FormContext} from '@xh/hoist/cmp/form';
import {div, fragment, span, vframe} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {throwIf, withDefault} from '@xh/hoist/utils/js';

import './FormField.scss';

/**
 * Standardised wrapper around a HoistInput Component.  FormField provides
 * consistent layout, labelling, and optional validation display for the input.
 *
 * FormField is typically used within a Form component, and bound to a particular Field within
 * the related FormModel. In this case, FormField will display validation information for its
 * bound field, and may receive behavioral and visual defaults from its contained Field.
 */
@HoistComponent
@StableIdSupport
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

        //----------------------
        // -- Default from Form
        //----------------------
        /**
         *  Apply minimal styling - validation errors are only displayed with a tooltip.
         *
         *  Defaulted from containing Form, or false.
         */
        minimal: PT.bool,

        /**
         * CommitOnChange property for underlying HoistInput (for inputs that support)
         *
         * Defaulted from containing Form.
         */
        commitOnChange: PT.bool,

        /**
         * Display warning glyph in the far left side of the input (TextField, NumberInput only).
         *
         * Defaulted from containing Form, or false.
         */
        leftErrorIcon: PT.bool,

        /**
         * True to focus or toggle input when label is clicked.
         *
         * Defaulted from containing Form, or true.
         */
        clickableLabel: PT.bool
    };

    baseClassName = 'xh-form-field';

    blockChildren = ['TextInput', 'JsonInput', 'Select'];

    static contextType = FormContext;

    render() {
        this.ensureConditions();

        const {label, info} = this.props;

        // Model related props
        const {fieldModel} = this,
            isRequired = fieldModel && fieldModel.isRequired,
            validationDisplayed = fieldModel && fieldModel.validationDisplayed,
            isPending = fieldModel && fieldModel.isValidationPending,
            notValid = fieldModel && fieldModel.isNotValid,
            displayNotValid = validationDisplayed && notValid,
            errors = fieldModel ? fieldModel.errors : [],
            labelStr = isUndefined(label) ? (fieldModel ? fieldModel.displayName : null) : label,
            inputId = this.props.children.props.id,
            idAttr = inputId ? inputId : this.stableId(),
            requiredStr = isRequired ? span(' *') : null;

        // Display related props
        const minimal = this.getDefaultedProp('minimal', false),
            leftErrorIcon = this.getDefaultedProp('leftErrorIcon', false),
            clickableLabel = this.getDefaultedProp('clickableLabel', true);

        const classes = [];
        if (isRequired) classes.push('xh-form-field-required');
        if (minimal) classes.push('xh-form-field-minimal');
        if (displayNotValid) classes.push('xh-form-field-invalid');

        const control = this.prepareChild({displayNotValid, errors, idAttr, leftErrorIcon, minimal});
        const infoDiv = info ? div({className: 'bp3-form-helper-text', item: info}) : null;

        return formGroup({
            item: vframe(control, infoDiv),
            width: 50,
            label: span({
                item: labelStr ? span(labelStr, requiredStr) : null,
                className: minimal && displayNotValid ? 'xh-form-field-error-label' : null
            }),
            labelFor: clickableLabel ? idAttr : null,
            className: this.getClassName(classes),
            helperText: !minimal && validationDisplayed ?
                fragment(
                    div({
                        omit: !isPending,
                        className: 'xh-form-field-pending',
                        item: spinner({size: 15})
                    }),
                    div({
                        omit: !displayNotValid,
                        className: 'xh-form-field-error-msg',
                        items: displayNotValid ? tooltip({
                            item: errors[0],
                            content: this.getErrorTooltipContent(errors)
                        }) : null
                    })
                ) : null
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

    prepareChild({displayNotValid, leftErrorIcon, idAttr, errors, minimal}) {
        const {fieldModel} = this,
            item = this.props.children;

        const overrides = {
            model: fieldModel,
            field: 'value',
            disabled: fieldModel && fieldModel.disabled,
            id: idAttr
        };
        if (displayNotValid && item.type.propTypes.leftIcon && leftErrorIcon) {
            overrides.leftIcon = Icon.warningCircle();
        }

        const target = React.cloneElement(item, overrides);

        if (!minimal) return target;

        // Wrap target in a tooltip if in minimal mode
        return tooltip({
            target,
            targetClassName: `xh-input ${displayNotValid ? 'xh-input-invalid' : ''}`,
            wrapperTagName: 'div',
            targetTagName: !this.blockChildren.includes(target.type.name) || target.props.width ? 'span' : 'div',
            position: 'right',
            disabled: !displayNotValid,
            content: this.getErrorTooltipContent(errors)
        });
    }


    getErrorTooltipContent(errors) {
        if (!errors || !errors.length) return null;
        if (errors.length == 1) return errors[0];
        return (
            <ul className="xh-form-field-error-tooltip">
                {errors.map((it, idx) => <li key={idx}>{it}</li>)}
            </ul>
        );
    }

    ensureConditions() {
        const child = this.props.children;
        throwIf(!child || isArray(child) || !(child.type.prototype instanceof HoistInput), 'FormField child must be a single component that extends HoistInput.');
        throwIf(child.props.field || child.props.model, 'HoistInputs should not specify "field" or "model" when used with FormField');
    }
}
export const formField = elemFactory(FormField);