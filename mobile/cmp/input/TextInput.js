/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {input} from '@xh/hoist/kit/onsen';
import {button} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isEmpty} from 'lodash';
import PT from 'prop-types';
import './TextInput.scss';

/**
 * A Text Input
 */
export const [TextInput, textInput] = hoistCmp.withFactory({
    displayName: 'TextInput',
    className: 'xh-text-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, Model);
    }
});
TextInput.propTypes = {
    ...HoistInputPropTypes,
    value: PT.string,

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
    autoComplete: PT.string,

    /** True to commit on every change/keystroke, default false. */
    commitOnChange: PT.bool,

    /** True to show a "clear" button aligned to the right of the control. Defaults to false. */
    enableClear: PT.bool,

    /** Onsen modifier string */
    modifier: PT.string,

    /** Function which receives keydown event */
    onKeyDown: PT.func,

    /** Text to display when control is empty */
    placeholder: PT.string,

    /** Whether text in field is selected when field receives focus */
    selectOnFocus: PT.bool,

    /** Whether to allow browser spell check, defaults to false */
    spellCheck: PT.bool,

    /** Alignment of entry text within control, default 'left'. */
    textAlign: PT.oneOf(['left', 'right']),

    /** Underlying HTML <input> element type. */
    type: PT.oneOf(['text', 'password'])
};
TextInput.hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
class Model extends HoistInputModel {

    get commitOnChange() {
        return withDefault(this.componentProps.commitOnChange, false);
    }

    get showClearButton() {
        const {enableClear, disabled} = this.componentProps;
        return enableClear && !disabled && !isEmpty(this.internalValue);
    }

    onChange = (ev) => {
        let {value} = ev.target;
        if (value === '') value = null;
        this.noteValueChange(value);
    };

    onKeyDown = (ev) => {
        if (ev.key === 'Enter') this.doCommit();
        this.componentProps.onKeyDown?.(ev);
    };

    onFocus = (ev) => {
        if (this.componentProps.selectOnFocus && ev.target && ev.target.select) {
            ev.target.select();
        }
        this.noteFocused();
    };
}

const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {
        const {width, ...layoutProps} = getLayoutProps(props);

        return hbox({
            ref,
            className,
            style: {
                ...props.style,
                ...layoutProps,
                width: withDefault(width, null)
            },
            items: [
                input({
                    value: model.renderValue || '',

                    autoComplete: withDefault(props.autoComplete, props.type === 'password' ? 'new-password' : 'off'),
                    disabled: props.disabled,
                    modifier: props.modifier,
                    placeholder: props.placeholder,
                    spellCheck: withDefault(props.spellCheck, false),
                    tabIndex: props.tabIndex,
                    type: props.type,
                    className: 'xh-text-input__input',
                    style: {textAlign: withDefault(props.textAlign, 'left')},

                    onChange: model.onChange,
                    onKeyDown: model.onKeyDown,
                    onBlur: model.onBlur,
                    onFocus: model.onFocus
                }),
                clearButton()
            ]
        });
    }
);

const clearButton = hoistCmp.factory(
    ({model}) => button({
        className: 'xh-text-input__clear-button',
        icon: Icon.cross(),
        tabIndex: -1,
        minimal: true,
        omit: !model.showClearButton,
        onClick: () => {
            model.noteValueChange(null);
            model.doCommit();
        }
    })
);
