/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {hoistComponent, elemFactory} from 'hoist/core';
import {textArea} from 'hoist/kit/blueprint';

import {HoistField} from './HoistField';

/**
 * A Text Area Field
 *
 * See HoistField for properties additional to those documented below.
 */
@hoistComponent()
export class TextAreaField extends HoistField {

    static propTypes = {
        /** Whether field should receive focus on render */
        autoFocus: PT.bool,
        /** Text to display when control is empty */
        placeholder: PT.string,
        /** Width of field, in pixels */
        width: PT.number,
        /** Whether to allow browser spell check, defaults to true */
        spellCheck: PT.bool
    };

    delegateProps = ['className', 'disabled', 'type', 'placeholder', 'autoFocus'];

    render() {
        const {style, width, spellCheck} = this.props;

        return textArea({
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
        if (ev.key === 'Enter' && !ev.shiftKey) this.doCommit();
    }

}
export const textAreaField = elemFactory(TextAreaField);