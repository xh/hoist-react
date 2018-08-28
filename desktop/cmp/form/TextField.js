/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {inputGroup} from '@xh/hoist/kit/blueprint';

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

        /** Whether field should receive focus on render */
        autoFocus: PT.bool,
        /** Type of input desired */
        type: PT.oneOf(['text', 'password']),
        /** Text to display when control is empty */
        placeholder: PT.string,
        /** Whether to allow browser spell check, defaults to false */
        spellCheck: PT.bool,
        /** Icon to display on the left side of the field */
        leftIcon: PT.element,
        /** Element to display on the right side of the field */
        rightElement: PT.element,
        onKeyPress: PT.func
    };

    delegateProps = ['className', 'disabled', 'type', 'placeholder', 'autoFocus', 'leftIcon', 'rightElement'];

    render() {
        const {style, width, spellCheck} = this.props;

        return inputGroup({
            value: this.renderValue || '',
            onChange: this.onChange,
            onKeyPress: this.onKeyPress,
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
    
    onKeyPress = (ev) => {
        if (ev.key === 'Enter') {
            this.doCommit();
        }
        const {onKeyPress} = this.props;
        if (onKeyPress) onKeyPress(ev);
    }

}
export const textField = elemFactory(TextField);