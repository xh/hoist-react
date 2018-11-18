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
import {div, fragment, span} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {throwIf} from '@xh/hoist/utils/js';

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
@StableIdSupport
export class FormField extends Component {

    static propTypes = {

        /** True (default) to focus or toggle input when label is clicked. */
        clickableLabel: PT.bool,

        /** True to disable user interaction. */
        disabled: PT.bool,

        /** Property name on bound Model from which to read/write data. */
        field: PT.string,

        /**
         * Label for form field.
         * Defaults to Field displayName if used with @FormSupport. Set to null to hide label.
         */
        label: PT.string,

        /** Display warning glyph in the far left side of the input (TextField, NumberInput only) */
        leftErrorIcon: PT.bool,

        /** Apply minimal styling - validation errors are only displayed with a tooltip */
        minimal: PT.bool
    };

    baseClassName = 'xh-form-field';

    blockChildren = ['TextInput', 'JsonInput', 'Select'];

    static contextType = FormContext;

    render() {
        this.ensureConditions();

        const {field: fieldName, label, minimal, className, labelFor, clickableLabel = true, ...rest} = this.props,
            {formModel} = this,
            field = formModel ? formModel.getField(fieldName) : null,
            isRequired = field && field.isRequired,
            validationDisplayed = field && field.validationDisplayed,
            isPending = field && field.isValidationPending,
            notValid = field && field.isNotValid,
            errors = field ? field.errors : [],
            labelStr = isUndefined(label) ? (field ? field.displayName : null) : label,
            inputId = this.props.children.props.id,
            idAttr = inputId ? inputId : this.stableId(),
            requiredStr = isRequired ? span(' *') : null,
            item = this.prepareChild(notValid && validationDisplayed, errors, idAttr),
            classes = [];

        if (isRequired) classes.push('xh-form-field-required');
        if (minimal) classes.push('xh-form-field-minimal');
        if (notValid && validationDisplayed) classes.push('xh-form-field-invalid');

        return formGroup({
            item,
            width: 50,
            label: span({
                item: labelStr ? span(labelStr, requiredStr) : null,
                className: minimal && validationDisplayed && notValid ? 'xh-form-field-error-label' : null
            }),
            labelFor: clickableLabel ? idAttr : null,
            className: this.getClassName(classes),
            helperText: !minimal && validationDisplayed ? fragment(
                div({
                    omit: !isPending,
                    className: 'xh-form-field-pending',
                    item: spinner({size: 15})
                }),
                div({
                    omit: !notValid,
                    className: 'xh-form-field-error-msg',
                    items: notValid ? tooltip({
                        item: errors[0],
                        content: this.getErrorTooltipContent(errors)
                    }) : null
                })
            ) : null,
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

    prepareChild(notValid, errors, idAttr) {
        const {field, minimal, disabled} = this.props,
            item = this.props.children;

        const leftIcon = notValid ? this.leftIcon(item) : {},
            target = React.cloneElement(item, {model: this.formModel, field, disabled, id: idAttr, ...leftIcon});

        if (!minimal) return target;

        // Wrap target in a tooltip if in minimal mode
        return tooltip({
            target,
            targetClassName: `xh-input ${notValid ? 'xh-input-invalid' : ''}`,
            wrapperTagName: 'div',
            targetTagName: !this.blockChildren.includes(target.type.name) || target.props.width ? 'span' : 'div',
            position: 'right',
            disabled: !notValid,
            content: this.getErrorTooltipContent(errors)
        });
    }

    leftIcon(item) {
        const leftIcon = item.props.leftIcon || (this.props.leftErrorIcon ? Icon.warningCircle() : null);
        return item.type.propTypes.leftIcon ? {leftIcon} : {};
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
        const item = this.props.children;
        throwIf(!item || isArray(item) || !(item.type.prototype instanceof HoistInput), 'FormField child must be a single component that extends HoistInput.');
        throwIf(item.props.field || item.props.model, 'HoistInputs should not specify "field" or "model" when used with FormField');
    }

}

export const formField = elemFactory(FormField);