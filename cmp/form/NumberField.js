/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {hoistComponent, elemFactory} from 'hoist/core';
import {numericInput} from 'hoist/kit/blueprint';
import {HoistField} from './HoistField';

/**
 * A Number Input Field
 *
 * See HoistField for properties additional to those documented below.
 */
@hoistComponent()
export class NumberField extends HoistField {

    static propTypes = {
        /** Text to display when control is empty */
        placeholder: PT.string,
        /** Width of field, in pixels */
        width: PT.number,
        /** minimum value */
        min: PT.number,
        /** maximum value */
        max: PT.number
    };
    
    delegateProps = ['className', 'min', 'max', 'placeholder'];

    render() {
        const {width, style} = this.props;

        return numericInput({
            value: this.renderValue,
            onValueChange: this.onValueChange,
            onKeyPress: this.onKeyPress,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            style: {...style, width},
            buttonPosition: 'none',
            ...this.getDelegateProps()
        });
    }

    onValueChange = (val, valAsString) => {
        this.noteValueChange(valAsString);
    }

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') this.doCommit();
    }

    toExternal(val) {
        return Number.parseFloat(val);
    }

    toInternal(val) {
        return val ? val.toString() : '';
    }
}
export const numberField = elemFactory(NumberField);