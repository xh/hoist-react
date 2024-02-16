/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {HoistInputProps} from '@xh/hoist/cmp/input';
import {HoistProps, HSide, LayoutProps, StyleProps} from '@xh/hoist/core';
import {ReactElement, ReactNode, Ref} from 'react';

export interface DesktopTextInputProps
    extends HoistProps,
        HoistInputProps,
        LayoutProps,
        StyleProps {
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
