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
import './TextArea.scss';

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
        spellCheck: PT.bool
    };

    delegateProps = ['className', 'disabled', 'type', 'placeholder'];

    baseClassName = 'xh-textarea-field';

    render() {
        const {style, width, spellCheck} = this.props;

        return textareaTag({
            className: this.getClassName(),
            value: this.renderValue || '',
            onChange: this.onChange,
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


    onBlur = () => {
        this.noteBlurred();
    }

    onFocus = () => {
        this.noteFocused();
    }

}
export const textArea = elemFactory(TextArea);