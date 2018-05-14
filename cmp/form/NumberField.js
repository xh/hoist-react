/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from 'hoist/core';
import {numericInput} from 'hoist/kit/blueprint';
import {HoistField} from './HoistField';

/**
 * A Number Input Field
 *
 * @see HoistField for properties additional to those documented below.
 */
@HoistComponent()
export class NumberField extends HoistField {

    static propTypes = {
        /** Text to display when control is empty */
        placeholder: PT.string,
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
        const ret = Number.parseFloat(val);
        return isFinite(ret) ? ret : null;
    }

    toInternal(val) {
        return val != null ? val.toString() : '';
    }
}
export const numberField = elemFactory(NumberField);