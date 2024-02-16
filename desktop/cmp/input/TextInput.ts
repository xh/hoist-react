/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {inputGroup} from '@xh/hoist/kit/blueprint';
import {getTestId, TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isEmpty} from 'lodash';
import {FocusEvent} from 'react';
import {DesktopTextInputProps} from '@xh/hoist/cmp/input';

export type TextInputProps = DesktopTextInputProps;

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

const cmp = hoistCmp.factory<TextInputProps & {model: TextInputModel}>(
    ({model, className, ...props}, ref) => {
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
    }
);

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
