/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {hoistComponent, elemFactory} from 'hoist/core';
import {numericInput} from 'hoist/kit/blueprint';
import {HoistField} from './HoistField';

/**
 * A Number Input Field
 *
 * @prop rest, see properties for HoistField
 *
 * @prop placeholder, text to display when control is empty
 * @prop width, width of field, in pixels
 * @prop min, minimum value
 * @prop max, maximum value
 */
@hoistComponent()
export class NumberField extends HoistField {
    
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