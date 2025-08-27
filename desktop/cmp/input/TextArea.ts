/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp, HoistProps, LayoutProps, StyleProps} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {textArea as bpTextarea} from '@xh/hoist/kit/blueprint';
import {TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {Ref} from 'react';
import './TextArea.scss';

export interface TextAreaProps extends HoistProps, HoistInputProps, LayoutProps, StyleProps {
    value?: string;

    /** True to focus the control on render. */
    autoFocus?: boolean;

    /** True to commit on every change/keystroke, default false. */
    commitOnChange?: boolean;

    /** Ref handler that receives HTML <input> element backing this component. */
    inputRef?: Ref<HTMLInputElement>;

    /** Callback for normalized keydown event. */
    onKeyDown?: (e: KeyboardEvent) => void;

    /** True to select contents when control receives focus. */
    selectOnFocus?: boolean;

    /** True to allow browser spell check, default false. */
    spellCheck?: boolean;

    /** Text to display when control is empty. */
    placeholder?: string;
}

/**
 * A multi-line text input.
 */
export const [TextArea, textArea] = hoistCmp.withFactory<TextAreaProps>({
    displayName: 'TextArea',
    className: 'xh-text-area',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, TextAreaInputModel);
    }
});
(TextArea as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
class TextAreaInputModel extends HoistInputModel {
    override xhImpl = true;

    override get commitOnChange() {
        return withDefault(this.componentProps.commitOnChange, false);
    }

    onChange = ev => {
        this.noteValueChange(ev.target.value);
    };

    onKeyDown = ev => {
        if (ev.key === 'Enter' && !ev.shiftKey) this.doCommit();
        this.componentProps.onKeyDown?.(ev);
    };

    override onFocus = ev => {
        if (this.componentProps.selectOnFocus) {
            ev.target.select();
        }
        this.noteFocused();
    };
}

// Note: we don't use the `ref` here, but the presence of a second argument is required.
const cmp = hoistCmp.factory<TextAreaInputModel>(({model, className, ...props}, ref) => {
    const {width, height, flex, ...layoutProps} = getLayoutProps(props);

    return bpTextarea({
        value: model.renderValue || '',

        autoFocus: props.autoFocus,
        disabled: props.disabled,
        inputRef: composeRefs(model.inputRef as Ref<HTMLTextAreaElement>, props.inputRef),
        placeholder: props.placeholder,
        spellCheck: withDefault(props.spellCheck, false),
        tabIndex: props.tabIndex,
        [TEST_ID]: props.testId,
        id: props.id,
        className,
        style: {
            ...props.style,
            ...layoutProps,
            width: withDefault(width, 300),
            height: withDefault(height, 100),
            flex: withDefault(flex, null)
        },
        onBlur: model.onBlur,
        onChange: model.onChange,
        onFocus: model.onFocus,
        onKeyDown: model.onKeyDown
    });
});
