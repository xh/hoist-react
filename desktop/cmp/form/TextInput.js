/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {inputGroup} from '@xh/hoist/kit/blueprint';
import {div} from '@xh/hoist/cmp/layout';
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
        value: PT.string,

        /** commit on every key stroke, defaults false */
        commitOnChange: PT.bool,
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

    baseClassName = 'xh-text-input';

    get commitOnChange() {
        withDefault(this.props.commitOnChange, false);
    }

    render() {
        const {props} = this,
            spellCheck = withDefault(props.spellCheck, true),
            autoComplete = withDefault(props.autoComplete, props.type == 'password' ? 'new-password' : 'nope');

        return div({
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            item: inputGroup({
                className: this.getClassName(),
                value: this.renderValue || '',
                autoComplete,
                onChange: this.onChange,
                onKeyPress: this.onKeyPress,
                style: {...props.style, width: props.width},
                spellCheck,
                disabled: props.disabled,
                type: props.type,
                placeholder: props.placeholder,
                autoFocus: props.autoFocus,
                leftIcon: props.leftIcon,
                tabIndex: props.tabIndex,
                rightElement: props.rightElement
            })
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
}
export const textInput = elemFactory(TextInput);