/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {inputGroup} from '@xh/hoist/kit/blueprint';

import {HoistInput} from '@xh/hoist/cmp/form';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * A Text Input
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class TextInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** Value of the control */
        value: PT.string,
        /** Whether field should receive focus on render */
        autoFocus: PT.bool,
        /**
         *  autocomplete attribute to set on underlying html <input> element.
         *
         *  Defaults to non-valid value 'nope' for fields of type text and 'new-password' for fields of type 'password'
         *  in order to most effectively defeat browser autocompletion. Set to 'on' to enable autocompletion.
         *
         *  See https://developer.mozilla.org/en-US/docs/Web/Security/Securing_your_site/Turning_off_form_autocompletion
         */
        autoComplete: PT.oneOf(['on', 'off', 'new-password', 'nope']),
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
        /** Function which receives Blueprint keypress event */
        onKeyPress: PT.func,
        /** Whether text in field is selected when field receives focus */
        selectOnFocus: PT.bool
    };

    delegateProps = ['className', 'disabled', 'type', 'placeholder', 'autoFocus', 'leftIcon', 'rightElement'];

    baseClassName = 'xh-text-input';

    render() {
        const {style, width, spellCheck, autoComplete, type} = this.props;

        return inputGroup({
            className: this.getClassName(),
            value: this.renderValue || '',
            autoComplete: withDefault(autoComplete, type == 'password' ? 'new-password' : 'nope'),
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
    };

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') {
            this.doCommit();
        }
        if (this.props.onKeyPress) this.props.onKeyPress(ev);
    }

    onFocus = (ev) => {
        if (this.props.selectOnFocus) {
            ev.target.select();
        }
        this.noteFocused();
    }

    onBlur = () => {
        this.noteBlurred();
    }

}
export const textInput = elemFactory(TextInput);