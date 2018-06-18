/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {input} from '@xh/hoist/kit/onsen';

import {HoistField} from './HoistField';

/**
 * A Text Input Field
 *
 * @see HoistField for properties additional to those documented below.
 */
@HoistComponent()
export class TextField extends HoistField {

    static propTypes = {
        ...HoistField.propTypes,

        /** Value of the control */
        value: PT.string,

        /** Type of input desired */
        type: PT.oneOf(['text', 'password']),
        /** Text to display when control is empty */
        placeholder: PT.string,
        /** Whether to allow browser spell check, defaults to false */
        spellCheck: PT.bool,
        /** Onsen modifier string */
        modifier: PT.string
    };

    delegateProps = ['className', 'disabled', 'type', 'placeholder', 'modifier'];

    render() {
        const {style, width, spellCheck} = this.props;

        return input({
            cls: 'xh-field xh-text-field',
            value: this.renderValue || '',
            onChange: this.onChange,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            style: {...style, width},
            spellCheck: !!spellCheck,
            ...this.getDelegateProps()
        });
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    }

}

export const textField = elemFactory(TextField);