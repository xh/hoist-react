/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {PropTypes as PT} from 'prop-types';
import {HoistInput} from '@xh/hoist/cmp/form';
import {formGroup} from '@xh/hoist/kit/blueprint';
import {div, span, hbox, hspacer} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/js';
import {isArray} from 'lodash';

/**
 * Wrapper around Blueprint's FormGroup component, which integrates
 * FieldSupport and Field validation. Accepts any props supported by Blueprint's FormGroup.
 */
@HoistComponent
export class FormField extends Component {

    static propTypes = {
        /** model to bind to */
        model: PT.object,
        /** name of property in model to bind to */
        field: PT.string,
        /** optional label for form field */
        label: PT.string
    };

    render() {
        const {model, field, ...rest} = this.props,
            item = this.prepareChild(),
            hasFieldSupport = model && field && model.hasFieldSupport,
            fieldModel = hasFieldSupport ? model.getField(field) : null,
            notValid = fieldModel && fieldModel.isNotValid,
            isRequired = fieldModel && fieldModel.isRequired,
            isPending = fieldModel && fieldModel.isValidationPending,
            labelStr = this.props.label || (fieldModel ? fieldModel.displayName : null),
            label = isRequired ? div(labelStr, span(' *')) : div(labelStr);

        return formGroup({
            label,
            item,
            helperText: hbox({
                height: 15,
                items: [
                    span({
                        style: {color: 'red'},
                        item: notValid ? fieldModel.errors[0] : ''
                    }),
                    hspacer(5),
                    span({
                        omit: !isPending,
                        item: 'Checking ...'
                    })
                ]
            }),
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