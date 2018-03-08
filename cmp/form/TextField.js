/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {upperFirst} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {inputGroup} from 'hoist/kit/blueprint';

/**
 * A model bindable Text Input
 *
 * @prop model
 * @prop field, name of property in model to bind to
 * @prop placeholder, text to display when control is empty
 * @prop width, width of field, in pixels,
 * @prop style
 */
@hoistComponent()
export class TextField extends Component {

    static defaultProps = {
        placeholder: '',
        width: 140
    }

    render() {
        const {model, field, placeholder, width, style} = this.props;

        return inputGroup({
            value: model[field],
            onChange: this.onChange,
            style: {...style, width},
            placeholder
        });
    }

    onChange = (ev) => {
        const {field} = this.props;
        this.model[`set${upperFirst(field)}`](ev.target.value);
    }
}
export const textField = elemFactory(TextField);