/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInput} from '@xh/hoist/cmp/input';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {textArea as bpTextarea} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import './TextArea.scss';

/**
 * A multi-line text input.
 */
@HoistComponent
@LayoutSupport
export class TextArea extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.string,

        /** True to focus the control on render. */
        autoFocus: PT.bool,

        /** True to commit on every change/keystroke, default false. */
        commitOnChange: PT.bool,

        /** Ref handler that receives HTML <input> element backing this component. */
        inputRef: PT.oneOfType([PT.instanceOf(Function), PT.instanceOf(Object)]),

        /** Callback for normalized keydown event. */
        onKeyDown: PT.func,

        /** True to select contents when control receives focus. */
        selectOnFocus: PT.bool,

        /** True to allow browser spell check, default false. */
        spellCheck: PT.bool,

        /** Text to display when control is empty. */
        placeholder: PT.string
    };

    baseClassName = 'xh-text-area';

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, false);
    }

    render() {
        const props = this.getNonLayoutProps(),
            {width, height, flex, ...layoutProps} = this.getLayoutProps();

        return bpTextarea({
            value: this.renderValue || '',

            autoFocus: props.autoFocus,
            disabled: props.disabled,
            inputRef: props.inputRef,
            placeholder: props.placeholder,
            spellCheck: withDefault(props.spellCheck, false),
            tabIndex: props.tabIndex,

            id: props.id,
            className: this.getClassName(),
            style: {
                ...props.style,
                ...layoutProps,
                height: withDefault(height, 100),
                width: withDefault(width, 300),
                flex: withDefault(flex, null)
            },
            onBlur: this.onBlur,
            onChange: this.onChange,
            onFocus: this.onFocus,
            onKeyDown: this.onKeyDown
        });
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    };

    onKeyDown = (ev) => {
        if (ev.key === 'Enter' && !ev.shiftKey) this.doCommit();
        if (this.props.onKeyDown) this.props.onKeyDown(ev);
    };

    onFocus = (ev) => {
        if (this.props.selectOnFocus) {
            ev.target.select();
        }
        this.noteFocused();
    };
}
export const textArea = elemFactory(TextArea);