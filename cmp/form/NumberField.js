/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {replace} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {numericInput} from 'hoist/kit/blueprint';
import {fmtNumber} from 'hoist/format';
import {HoistField} from './HoistField';

/**
 * A Number Input Field
 *
 * @see HoistField for properties additional to those documented below.
 */
@hoistComponent()
export class NumberField extends HoistField {

    static propTypes = {
        /** Text to display when control is empty */
        placeholder: PT.string,
        /** minimum value */
        min: PT.number,
        /** maximum value */
        max: PT.number,
        /** Constrain input to numeric characters, should be set to false for advanced input evaluation */
        allowNumericCharactersOnly: PT.bool,
        /** Whether to display large values with commas */
        displayWithDelimiters: PT.bool
    };
    
    delegateProps = ['className', 'min', 'max', 'placeholder'];

    render() {
        const {width, style, allowNumericCharactersOnly} = this.props;

        return numericInput({
            value: this.renderValue,
            onValueChange: this.onValueChange,
            onKeyPress: this.onKeyPress,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            style: {...style, width},
            buttonPosition: 'none',
            // allowNumericCharactersOnly: allowNumericCharactersOnly !== false,
            allowNumericCharactersOnly: false, // test code remove, use above
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
        const normalizedVal = this.normalizeVal(val),
            ret = Number.parseFloat(normalizedVal);
        return isFinite(ret) ? ret : null;
    }

    toInternal(val) {
        if (val == null) return '';

        // Colin believes that the client is super used to seeing '1b' if that's what they've entered However:
        // The following won't work here, we are getting passed the external normalized value back from onCommit called onBlur
        // if (['k', 'm', 'b'].includes(val.slice(-1))) return val;
        // we could always do the math and abbv here but then if the client enters eg 1000 we'd be not be in a WYSIWYG place there
        // what I think we need is a way to remember what the user entered previous to the commit to consult that, but... ew.
        // Alternatively we can override doCommit here to

        // return this.props.displayWithDelimiters ? fmtNumber(val, {formatPattern: '0,0[.]00'}) : val.toString(); // might want to think about building this pattern based on input... i.e. did they enter trailing zeros or a decimal? If so we should give them back.
        return fmtNumber(val, {formatPattern: '0,0'}); // test code, remove and use line above
    }

    onFocus = () => {
        this.setInternalValue(this.toInternal(this.externalValue));
        this.setHasFocus(true);
    }

    normalizeVal(val) {
        val = replace(val, /,/g, '');
        return replace(val, /((\.\d+)|(\d+(\.\d+)?))(k|m|b)\b/gi, this.expandAbbreviatedNumber);
    }

    expandAbbreviatedNumber(value) {
        if (!value) {
            return value;
        }

        const num = +value.substring(0, value.length - 1);
        const lastChar = value.charAt(value.length - 1).toLowerCase();

        let result;

        if (lastChar === 'k') {
            result = num * 1000;
        } else if (lastChar === 'm') {
            result = num * 1000000;
        } else if (lastChar === 'b') {
            result = num * 1000000000;
        }

        const isValid = result != null && !isNaN(result);


        return isValid ? result.toString() : '';
    };


}
export const numberField = elemFactory(NumberField);