/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {input} from '@xh/hoist/kit/onsen';
import {button} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isEmpty} from 'lodash';
import {MobileTextInputProps} from '@xh/hoist/cmp/input';
import './TextInput.scss';

export type TextInputProps = MobileTextInputProps;

/**
 * A Text Input
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
class TextInputModel extends HoistInputModel {
    override xhImpl = true;

    override get commitOnChange() {
        return withDefault(this.componentProps.commitOnChange, false);
    }

    get showClearButton() {
        const {enableClear, disabled} = this.componentProps;
        return enableClear && !disabled && !isEmpty(this.internalValue);
    }

    onChange = ev => {
        let {value} = ev.target;
        if (value === '') value = null;
        this.noteValueChange(value);
    };

    onKeyDown = ev => {
        if (ev.key === 'Enter') this.doCommit();
        this.componentProps.onKeyDown?.(ev);
    };

    override onFocus = ev => {
        if (this.componentProps.selectOnFocus && ev.target && ev.target.select) {
            ev.target.select();
        }
        this.noteFocused();
    };
}

const cmp = hoistCmp.factory<TextInputModel>(({model, className, ...props}, ref) => {
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

                autoComplete: withDefault(
                    props.autoComplete,
                    props.type === 'password' ? 'new-password' : 'off'
                ),
                disabled: props.disabled,
                modifier: props.modifier,
                placeholder: props.placeholder,
                spellCheck: withDefault(props.spellCheck, false),
                tabIndex: props.tabIndex,
                type: props.type,
                className: 'xh-text-input__input',
                style: {textAlign: withDefault(props.textAlign, 'left')},

                onInput: model.onChange,
                onKeyDown: model.onKeyDown,
                onBlur: model.onBlur,
                onFocus: model.onFocus
            }),
            clearButton()
        ]
    });
});

const clearButton = hoistCmp.factory<TextInputModel>(({model}) =>
    button({
        className: 'xh-text-input__clear-button',
        icon: Icon.cross(),
        tabIndex: -1,
        minimal: true,
        omit: !model.showClearButton,
        onClick: () => {
            model.noteValueChange(null);
            model.doCommit();
            model.focus();
        }
    })
);
