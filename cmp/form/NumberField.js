/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {numericInput} from 'hoist/kit/blueprint';

import {bindableField} from './BindableField';

/**
 * A Number Input Field
 *
 * @prop value, number
 * @prop onChange, handler to fire when value changes
 * @prop model, model to bind to
 * @prop field, name of property in model to bind to
 * @prop disabled, is control disabled
 * @prop style
 * @prop className
 *
 * @prop placeholder, text to display when control is empty
 * @prop width, width of field, in pixels
 * @prop min, minimum value
 * @prop max, maximum value
 */
@bindableField
@hoistComponent()
export class NumberField extends Component {
    
    delegateProps = ['className', 'min', 'max', 'placeholder'];

    render() {
        const {width, style} = this.props;

        return numericInput({
            value: this.readValue(),
            onChange: this.onChange,
            style: {...style, width},
            buttonPosition: 'none',
            ...this.getDelegateProps()
        });
    }

    onChange = (val, valAsString) => {
        val = (valAsString === '') ? null : val;
        this.noteValueChange(val);
    }
}
export const numberField = elemFactory(NumberField);