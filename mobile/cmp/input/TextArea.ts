/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div, textarea as textareaTag} from '@xh/hoist/cmp/layout';
import {hoistCmp, LayoutProps, StyleProps} from '@xh/hoist/core';
import '@xh/hoist/mobile/register';
import {withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import './TextArea.scss';
import {ForwardedRef} from 'react';

export interface TextAreaProps extends HoistInputProps<null>, StyleProps, LayoutProps {
    value?: string;

    /** True to commit on every change/keystroke, default false. */
    commitOnChange?: boolean;

    /** Height of the control in pixels. */
    height?: number;

    /** Text to display when control is empty */
    placeholder?: string;

    /** Whether text in field is selected when field receives focus */
    selectOnFocus?: boolean;

    /** Whether to allow browser spell check, defaults to true */
    spellCheck?: boolean;
}

/**
 * A multi-line text input.
 */
export const [TextArea, textArea] = hoistCmp.withFactory<TextAreaProps>({
    displayName: 'TextArea',
    className: 'xh-textarea',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, TextAreaInputModel);
    }
});
(TextArea as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
class TextAreaInputModel extends HoistInputModel<null> {
    override xhImpl = true;

    override get commitOnChange() {
        return withDefault(this.componentProps.commitOnChange, false);
    }

    override get inputEl() {
        return this.domEl.querySelector('textarea');
    }

    onChange = ev => {
        this.noteValueChange(ev.target.value);
    };

    onKeyDown = ev => {
        this.componentProps.onKeyDown?.(ev);
    };

    override onFocus = ev => {
        if (this.componentProps.selectOnFocus && ev.target && ev.target.select) {
            ev.target.select();
        }
        this.noteFocused();
    };
}

const cmp = hoistCmp.factory<TextAreaInputModel>(({model, className, ...props}, ref) => {
    const {width, height, ...layoutProps} = getLayoutProps(props);

    return div({
        item: textareaTag({
            value: model.renderValue || '',

            disabled: props.disabled,
            placeholder: props.placeholder,
            spellCheck: withDefault(props.spellCheck, false),
            tabIndex: props.tabIndex,

            onChange: model.onChange,
            onKeyDown: model.onKeyDown,
            onBlur: model.onBlur,
            onFocus: model.onFocus
        }),
        style: {
            ...props.style,
            ...layoutProps,
            width: withDefault(width, null),
            height: withDefault(height, 100)
        },

        className,
        ref: ref as ForwardedRef<any>
    });
});
