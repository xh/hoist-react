/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {PropTypes as PT} from 'prop-types';
import {div, span} from '@xh/hoist/cmp/layout';
import {HoistInput} from '@xh/hoist/cmp/form';
import {label as labelCmp} from '@xh/hoist/mobile/cmp/form';
import {throwIf} from '@xh/hoist/utils/js';
import {isArray, isUndefined} from 'lodash';

import './FormField.scss';

/**
 * Standardised wrapper around a HoistInput Component.
 *
 * Should receive a single HoistInput as a child element. FormField is typically bound
 * to a model enhanced with `@FieldSupport` via its `model` and `field` props. This allows
 * FormField to automatically display a label, a required asterisk, and any validation messages.
 *
 * When FormField is used in bound mode, the child HoistInput should *not* declare its own
 * `model` and `field` props, as these are managed by the FormField.
 */
@HoistComponent
export class FormField extends Component {

    static propTypes = {
        /** Bound Model. */
        model: PT.object,
        /** Name of bound property on Model. */
        field: PT.string,
        /**
         * Label for form field.
         * Defaults to Field displayName if used with @FieldSupport. Set to null to hide label.
         */
        label: PT.string
    };

    baseClassName = 'xh-form-field';

    render() {
        const {model, field, label, ...rest} = this.props,
            item = this.prepareChild(),
            hasFieldSupport = model && field && model.hasFieldSupport,
            fieldModel = hasFieldSupport ? model.getField(field) : null,
            isRequired = fieldModel && fieldModel.isRequired,
            isPending = fieldModel && fieldModel.isValidationPending,
            notValid = fieldModel && fieldModel.isNotValid,
            errors = fieldModel ? fieldModel.errors : [],
            labelStr = isUndefined(label) ? (fieldModel ? fieldModel.displayName : null) : label,
            requiredStr = isRequired ? span(' *') : null,
            classes = [];

        if (isRequired) classes.push('xh-form-field-required');
        if (notValid) classes.push('xh-form-field-invalid');

        return div({
            className: this.getClassName(classes),
            items: [
                labelStr ? labelCmp(labelStr, requiredStr) : null,
                item,
                div({
                    omit: !isPending,
                    className: 'xh-form-field-pending-msg',
                    item: 'Validating...'
                }),
                div({
                    omit: !notValid,
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
    prepareChild() {
        const {model, field} = this.props,
            item = this.props.children;

        throwIf(isArray(item) || !(item.type.prototype instanceof HoistInput), 'FormField child must be a single component that extends HoistInput.');
        throwIf(item.props.field || item.props.model, 'HoistInputs should not declare "field" or "model" when used with FormField');

        return React.cloneElement(item, {model, field});
    }

}

export const formField = elemFactory(FormField);