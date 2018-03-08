/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {textArea} from 'hoist/kit/blueprint';

import {bindableField} from './BindableField';

/**
 * A Text Area Field
 *
 * @prop value, string
 * @prop onChange, handler to fire when value changes
 * @prop model, model to bind to
 * @prop field, name of property in model to bind to
 * @prop disabled, is control disabled
 * @prop style
 * @prop className
 *
 * @prop autoFocus
 * @prop type, 'text' or 'password'
 * @prop placeholder, text to display when control is empty
 * @prop width, width of field, in pixels,
 */
@bindableField
@hoistComponent()
export class TextAreaField extends Component {
    
    delegateProps = ['className', 'disabled', 'type', 'placeholder', 'autoFocus'];

    render() {
        const {style, width} = this.props;

        return textArea({
            value: this.readValue() || '',
            onChange: this.onChange,
            style: {...style, width},
            ...this.getDelegateProps()
        });
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    }
}
export const textAreaField = elemFactory(TextAreaField);