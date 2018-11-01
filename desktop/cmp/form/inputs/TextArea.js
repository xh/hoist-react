/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {textArea as bpTextarea} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/form';

import './TextArea.scss';

/**
 * A multi-line text input.
 */
@HoistComponent
export class TextArea extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.string,

        /** True to focus the control on render. */
        autoFocus: PT.bool,

        /** True to commit on every change/keystroke, default false. */
        commitOnChange: PT.bool,

        /** True to take up the full width of container. */
        fill: PT.bool,

        /** Height of the control in pixels. */
        height: PT.number,

        /** True to select contents when control receives focus. */
        selectOnFocus: PT.bool,

        /** True to allow browser spell check, default false. */
        spellCheck: PT.bool,

        /** Text to display when control is empty. */
        placeholder: PT.string,

        /** Width of the control in pixels. */
        width: PT.number
    };

    baseClassName = 'xh-text-area';

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, false);
    }
    
    render() {
        const {props} = this;

        return bpTextarea({
            value: this.renderValue || '',

            autoFocus: props.autoFocus,
            disabled: props.disabled,
            fill: props.fill,
            placeholder: props.placeholder,
            spellCheck: withDefault(props.spellCheck, false),
            tabIndex: props.tabIndex,

            className: this.getClassName(),
            style: {
                height: props.height,
                width: props.width,
                ...props.style
            },

            onBlur: this.onBlur,
            onChange: this.onChange,
            onFocus: this.onFocus,
            onKeyPress: this.onKeyPress
        });
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    };

    onKeyPress = (ev) => {
        if (ev.key === 'Enter' && !ev.shiftKey) this.doCommit();
    };

    onFocus = (ev) => {
        if (this.props.selectOnFocus) {
            ev.target.select();
        }
        this.noteFocused();
    };
}
export const textArea = elemFactory(TextArea);