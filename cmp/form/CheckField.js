/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {upperFirst} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {label} from 'hoist/cmp';
import {checkbox} from 'hoist/kit/blueprint';

/**
 * A model bindable Checkbox
 *
 * @prop model
 * @prop field, name of property in model to bind to
 * @prop text, name of field
 * @prop style
 */
@hoistComponent()
export class CheckField extends Component {

    static defaultProps = {
        text: ''
    }

    render() {
        const {model, field, text, style} = this.props;

        return checkbox({
            checked: model[field],
            onChange: this.onChange,
            style: {...style, marginBottom: '0px', marginRight: '0px'},
            label: label(text),
            inline: true
        });
    }

    onChange = (e) => {
        const {field} = this.props;
        this.model[`set${upperFirst(field)}`](e.target.checked);
    }
}
export const checkField = elemFactory(CheckField);