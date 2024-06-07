/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {
    WithoutModelAndRef,
    hoistCmp,
    HoistProps,
    HSide,
    LayoutProps,
    StyleProps
} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {inputGroup} from '@xh/hoist/kit/blueprint';
import {getTestId, TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isEmpty} from 'lodash';
import {FocusEvent, ReactElement, ReactNode, Ref} from 'react';

export interface TextInputProps extends HoistInputProps, LayoutProps, StyleProps {
    value?: string;

    /**
     *  HTML `autocomplete` attribute to set on underlying <input> element.
     *
     *  Defaults to 'off' for fields of type text and 'new-password' for fields of type 'password'
     *  to defeat browser auto-completion, which is typically not desired in Hoist applications.
     *  Set to 'on' or a more specific autocomplete token to enable.
     *
     * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls%3A-the-autocomplete-attribute
     * @see https://developer.mozilla.org/en-US/docs/Web/Security/Securing_your_site/Turning_off_form_autocompletion
     */
    autoComplete?: string;

    /** True to focus the control on render. */
    autoFocus?: boolean;

    /** True to commit on every change/keystroke, default false. */
    commitOnChange?: boolean;

    /** True to show a "clear" button as the right element. default false */
    enableClear?: boolean;

    /** Ref handler that receives HTML <input> element backing this component. */
    inputRef?: Ref<HTMLInputElement>;

    /** Icon to display inline on the left side of the input. */
    leftIcon?: ReactElement;

    /** Callback for normalized keydown event. */
    onKeyDown?: (e: KeyboardEvent) => void;

    /** Text to display when control is empty. */
    placeholder?: string;

    /** Element to display inline on the right side of the input. */
    rightElement?: ReactNode;

    /** True to display with rounded caps. */
    round?: boolean;

    /** True to select contents when control receives focus. */
    selectOnFocus?: boolean;

    /** Alignment of entry text within control, default 'left'. */
    textAlign?: HSide;

    /** True to allow browser spell check, default false. */
    spellCheck?: boolean;

    /** Underlying HTML <input> element type. */
    type?: 'text' | 'password';
}

/**
 * A single-line text input with additional support for embedded icons/elements.
 */
export const [TextInput, textInput] = hoistCmp.withFactory<TextInputProps>({
    displayName: 'TextInput',
    className: 'xh-text-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, TextInputModel);
    }
});
(TextInput as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
export class TextInputModel extends HoistInputModel {
    override xhImpl = true;

    override get commitOnChange() {
        return withDefault(this.componentProps.commitOnChange, false);
    }

    onChange = ev => {
        let {value} = ev.target;
        if (value === '') value = null;
        this.noteValueChange(value);
    };

    onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === 'Enter') this.doCommit();
        this.componentProps.onKeyDown?.(ev);
    };

    override onFocus = (ev: FocusEvent) => {
        const target = ev.target as HTMLElement;
        if (this.componentProps.selectOnFocus && target.nodeName === 'INPUT') {
            (target as HTMLInputElement).select();
        }
        this.noteFocused();
    };
}
const cmp = hoistCmp.factory<
    HoistProps<TextInputModel, HTMLDivElement> & WithoutModelAndRef<TextInputProps>
>(({model, className, ...props}, ref) => {
    const {width, flex, ...layoutProps} = getLayoutProps(props);

    const isClearable = !isEmpty(model.internalValue);

    return div({
        item: inputGroup({
            value: model.renderValue || '',

            autoComplete: withDefault(
                props.autoComplete,
                props.type === 'password' ? 'new-password' : 'off'
            ),
            autoFocus: props.autoFocus,
            disabled: props.disabled,
            inputRef: composeRefs(model.inputRef, props.inputRef),
            leftIcon: props.leftIcon,
            placeholder: props.placeholder,
            rightElement:
                props.rightElement ||
                (props.enableClear && !props.disabled && isClearable ? clearButton() : null),
            round: withDefault(props.round, false),
            spellCheck: withDefault(props.spellCheck, false),
            tabIndex: props.tabIndex,
            type: props.type,

            id: props.id,
            style: {
                ...props.style,
                ...layoutProps,
                textAlign: withDefault(props.textAlign, 'left')
            },
            [TEST_ID]: props.testId,
            onChange: model.onChange,
            onKeyDown: model.onKeyDown
        }),

        className,
        style: {
            width: withDefault(width, 200),
            flex: withDefault(flex, null)
        },

        onBlur: model.onBlur,
        onFocus: model.onFocus,
        ref
    });
});

const clearButton = hoistCmp.factory<TextInputModel>(({model}) =>
    button({
        icon: Icon.cross(),
        tabIndex: -1,
        minimal: true,
        testId: getTestId(model.componentProps, 'clear-btn'),
        onClick: () => {
            model.noteValueChange(null);
            model.doCommit();
            model.focus();
        }
    })
);
