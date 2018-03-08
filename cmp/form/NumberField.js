/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {upperFirst} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {numericInput} from 'hoist/kit/blueprint';

/**
 * A model bindable Number Input
 *
 * @prop model
 * @prop field, name of property in model to bind to
 * @prop placeholder, text to display when control is empty
 * @prop width, width of field, in pixels
 * @prop min, minimum value
 * @prop max, maximum value
 * @prop style
 */
@hoistComponent()
export class NumberField extends Component {

    static defaultProps = {
        placeholder: '',
        width: 80,
        min: null,
        max: null
    }

    render() {
        const {model, field, placeholder, width, min, max, style} = this.props;

        return numericInput({
            value: model[field],
            onChange: this.onChange,
            style: {...style, width},
            buttonPosition: 'none',
            placeholder,
            min,
            max
        });
    }

    onChange = (value) => {
        const {field} = this.props;
        this.model[`set${upperFirst(field)}`](value);
    }
}
export const numberField = elemFactory(NumberField);