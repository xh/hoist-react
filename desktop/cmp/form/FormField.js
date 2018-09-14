/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {isArray, isUndefined} from 'lodash';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {formGroup, spinner, tooltip} from '@xh/hoist/kit/blueprint';
import {HoistInput} from '@xh/hoist/cmp/form';
import {div, fragment, span} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/js';

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
 *
 * Accepts any props supported by Blueprint's FormGroup.
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

        return formGroup({
            item,
            label: labelStr ? span(labelStr, requiredStr) : null,
            className: this.getClassName(classes),
            helperText: fragment(
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
                        content: (
                            <ul className="xh-form-field-error-tooltip">
                                {errors.map((it, idx) => <li key={idx}>{it}</li>)}
                            </ul>
                        )
                    }) : null
                })
            ),
            ...rest
        });
    }


    //--------------------
    // Implementation
    //--------------------
    prepareChild() {
        const {model, field, disabled} = this.props,
            item = this.props.children;

        throwIf(isArray(item) || !(item.type.prototype instanceof HoistInput), 'FormField child must be a single component that extends HoistInput.');
        throwIf(item.props.field || item.props.model, 'HoistInputs should not declare "field" or "model" when used with FormField');

        return React.cloneElement(item, {model, field, disabled});
    }

}

export const formField = elemFactory(FormField);