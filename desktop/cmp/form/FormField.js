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
import {Icon} from '@xh/hoist/icon';
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
        label: PT.string,
        /** Apply minimal styling - validation errors not displayed in helperText */
        minimal: PT.bool
    };

    baseClassName = 'xh-form-field';


    render() {
        const {model, field, label, minimal, ...rest} = this.props,
            hasFieldSupport = model && field && model.hasFieldSupport,
            fieldModel = hasFieldSupport ? model.getField(field) : null,
            isRequired = fieldModel && fieldModel.isRequired,
            isPending = fieldModel && fieldModel.isValidationPending,
            notValid = fieldModel && fieldModel.isNotValid,
            errors = fieldModel ? fieldModel.errors : [],
            labelStr = isUndefined(label) ? (fieldModel ? fieldModel.displayName : null) : label,
            requiredStr = isRequired ? span(' *') : null,
            item = this.prepareChild(notValid, errors),
            classes = [];

        if (isRequired) classes.push('xh-form-field-required');
        if (notValid) classes.push('xh-form-field-invalid');
        if (minimal) classes.push('xh-form-field-minimal');
        return formGroup({
            item,
            label: labelStr ? span(labelStr, requiredStr) : null,
            className: this.getClassName(classes),
            helperText: !minimal ? fragment(
                div({
                    omit: !isPending || minimal,
                    className: 'xh-form-field-pending',
                    item: spinner({size: 15})
                }),
                div({
                    omit: !notValid || minimal,
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
            ) : null,
            ...rest
        });
    }


    //--------------------
    // Implementation
    //--------------------
    prepareChild(notValid, errors) {
        const {model, field, disabled, minimal} = this.props;
        const item = this.props.children;

        throwIf(!item || isArray(item) || !(item.type.prototype instanceof HoistInput), 'FormField child must be a single component that extends HoistInput.');
        throwIf(item.props.field || item.props.model, 'HoistInputs should not declare "field" or "model" when used with FormField');

        if (minimal && notValid) {
            const target = React.cloneElement(item, {
                model,
                field,
                disabled,
                leftIcon: Icon.warningCircle(),
                className: 'xh-input xh-input-invalid xh-text-input'
            });

            return tooltip({
                target,
                wrapperTagName: 'div',
                targetTagName: 'div',
                position: 'right',
                width: '100%',
                content: notValid ? (
                    <ul className="xh-form-field-error-tooltip">
                        {errors.map((it, idx) => <li key={idx}>{it}</li>)}
                    </ul>
                ) : div()
            })
        }
        return React.cloneElement(item, {model, field, disabled});

    }

}

export const formField = elemFactory(FormField);