/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {inputGroup} from '@xh/hoist/kit/blueprint';
import {div} from '@xh/hoist/cmp/layout';
import {HoistInput} from '@xh/hoist/cmp/input';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * A single-line text input with additional support for embedded icons/elements.
 */
@HoistComponent
@LayoutSupport
export class TextInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.string,

        /**
         *  HTML `autocomplete` attribute to set on underlying <input> element.
         *
         *  Defaults to non-valid value 'nope' for fields of type text and 'new-password' for fields
         *  of type 'password' to defeat browser auto-completion, which is typically not desired in
         *  Hoist applications. Set to 'on' or a more specific autocomplete token to enable.
         *
         * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls%3A-the-autocomplete-attribute
         * @see https://developer.mozilla.org/en-US/docs/Web/Security/Securing_your_site/Turning_off_form_autocompletion
         */
        autoComplete: PT.string,

        /** True to focus the control on render. */
        autoFocus: PT.bool,

        /** True to commit on every change/keystroke, default false. */
        commitOnChange: PT.bool,

        /** True to show a "clear" button as the right element. default false */
        enableClear: PT.bool,

        /** Icon to display inline on the left side of the input. */
        leftIcon: PT.element,

        /** Callback for normalized keydown event. */
        onKeyDown: PT.func,

        /** Text to display when control is empty. */
        placeholder: PT.string,

        /** Element to display inline on the right side of the input. */
        rightElement: PT.element,

        /** True to display with rounded caps. */
        round: PT.bool,

        /** True to select contents when control receives focus. */
        selectOnFocus: PT.bool,

        /** Alignment of entry text within control, default 'left'. */
        textAlign: PT.oneOf(['left', 'right']),

        /** True to allow browser spell check, default false. */
        spellCheck: PT.bool,

        /** Underlying HTML <input> element type. */
        type: PT.oneOf(['text', 'password'])
    };

    baseClassName = 'xh-text-input';

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, false);
    }

    render() {
        const props = this.getNonLayoutProps(),
            {width, flex, ...layoutProps} = this.getLayoutProps();

        const isClearable = (this.internalValue !== null);

        return div({
            item: inputGroup({
                value: this.renderValue || '',

                autoComplete: withDefault(props.autoComplete, props.type == 'password' ? 'new-password' : 'nope'),
                autoFocus: props.autoFocus,
                disabled: props.disabled,
                leftIcon: props.leftIcon,
                placeholder: props.placeholder,
                rightElement: props.rightElement || (props.enableClear && isClearable ? this.renderClearButton() : null),
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

                onChange: this.onChange,
                onKeyDown: this.onKeyDown
            }),

            className: this.getClassName(),
            style: {
                width: withDefault(width, 200),
                flex: withDefault(flex, null)
            },

            onBlur: this.onBlur,
            onFocus: this.onFocus
        });
    }

    renderClearButton() {
        const {disabled} = this.getNonLayoutProps();
        return button({
            icon: Icon.cross(),
            omit: disabled,
            tabIndex: -1,
            minimal: true,
            onClick: () => {
                this.noteValueChange(null);
                this.doCommit();
            }
        });
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    };

    onKeyDown = (ev) => {
        if (ev.key === 'Enter') this.doCommit();
        if (this.props.onKeyDown) this.props.onKeyDown(ev);
    }

    onFocus = (ev) => {
        if (this.props.selectOnFocus) {
            ev.target.select();
        }
        this.noteFocused();
    }
}
export const textInput = elemFactory(TextInput);