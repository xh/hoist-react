/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {hoistComponent, elemFactory} from 'hoist/core';
import {textArea} from 'hoist/kit/blueprint';

import {HoistField} from './HoistField';

/**
 * A Text Area Field
 *
 * @prop rest, see general properties for HoistField
 *
 * @prop {boolean} [autoFocus=false]
 * @prop {string} [placeholder] - text to display when control is empty
 * @prop {number} [width] - width of field, in pixels
 * @prop {boolean} [spellCheck=true]
 */
@hoistComponent()
export class TextAreaField extends HoistField {
    
    delegateProps = ['className', 'disabled', 'type', 'placeholder', 'autoFocus', 'spellCheck'];

    render() {
        const {style, width} = this.props;

        return textArea({
            value: this.renderValue || '',
            onChange: this.onChange,
            onKeyPress: this.onKeyPress,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            style: {...style, width},
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