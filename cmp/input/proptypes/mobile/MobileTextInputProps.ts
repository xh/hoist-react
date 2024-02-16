/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {HoistInputProps} from '@xh/hoist/cmp/input';
import {HoistProps, HSide, LayoutProps, StyleProps} from '@xh/hoist/core';

export interface MobileTextInputProps extends HoistProps, HoistInputProps, StyleProps, LayoutProps {
    value?: string;

    /**
     *  HTML `autocomplete` attribute to set on underlying <input> element.
     *
     *  Defaults to 'off' for fields of type text and 'new-password' for fields of type 'password'
     *  to defeat browser auto-completion, which is typically not desired in Hoist applications.
     *  Set to 'on' or a more specific autocomplete token to enable.
     *
     * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls%3A-the-autocomplete-attribute
     * See https://developer.mozilla.org/en-US/docs/Web/Security/Securing_your_site/Turning_off_form_autocompletion
     */
    autoComplete?: string;

    /** True to commit on every change/keystroke, default false. */
    commitOnChange?: boolean;

    /** True to show a "clear" button aligned to the right of the control. Defaults to false. */
    enableClear?: boolean;

    /** Onsen modifier string */
    modifier?: string;

    /** Text to display when control is empty */
    placeholder?: string;

    /** Whether text in field is selected when field receives focus */
    selectOnFocus?: boolean;

    /** Whether to allow browser spell check, defaults to false */
    spellCheck?: boolean;

    /** Alignment of entry text within control, default 'left'. */
    textAlign?: HSide;

    /** Underlying HTML <input> element type. */
    type?: 'text' | 'password';
}
