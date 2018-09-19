/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {textarea as textareaTag} from '@xh/hoist/cmp/layout';

import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * A Text Area Input
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class TextArea extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** Value of the control */
        value: PT.string,

        /** Text to display when control is empty */
        placeholder: PT.string,
        /** Whether to allow browser spell check, defaults to true */
        spellCheck: PT.bool,
        /** Function which receives keypress event */
        onKeyPress: PT.func,
        /** Whether text in field is selected when field receives focus */
        selectOnFocus: PT.bool
    };

    delegateProps = ['className', 'disabled', 'type', 'placeholder'];

    baseClassName = 'xh-textarea';

    render() {
        const {style, width, spellCheck} = this.props;

        return textareaTag({
            className: this.getClassName(),
            value: this.renderValue || '',
            onChange: this.onChange,
            onKeyPress: this.onKeyPress,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            style: {...style, width},
            spellCheck: spellCheck !== false,
            ...this.getDelegateProps()
        });
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    }

    onKeyPress = (ev) => {
        if (this.props.onKeyPress) this.props.onKeyPress(ev);
    }

    onBlur = () => {
        this.noteBlurred();
    }

    onFocus = (ev) => {
        if (this.props.selectOnFocus && ev.target && ev.target.select) {
            ev.target.select();
        }
        this.noteFocused();
    }

}
export const textArea = elemFactory(TextArea);