/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {label} from 'hoist/cmp';
import {checkbox} from 'hoist/kit/blueprint';

import {bindableField} from './BindableField';

/**
 * A CheckBox field for editing a boolean value
 *
 * @prop value, boolean
 * @prop onChange, handler to fire when value changes
 * @prop model, model to bind to
 * @prop field, name of property in model to bind to
 * @prop disabled, is control disabled
 * @prop style
 *
 * @prop text, name of field
 */
@bindableField
@hoistComponent()
export class CheckField extends Component {

    static defaultProps = {
        text: ''
    }

    render() {
        const {text, style, disabled} = this.props;

        return checkbox({
            checked: this.readValue(),
            onChange: this.onChange,
            style: {...style, marginBottom: '0px', marginRight: '0px'},
            label: label(text),
            inline: true,
            disabled
        });
    }

    onChange = (e) => {
        this.noteValueChange(e.target.checked);
    }
}
export const checkField = elemFactory(CheckField);