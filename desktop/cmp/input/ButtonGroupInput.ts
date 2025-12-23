/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp, HoistModel, Intent, XH} from '@xh/hoist/core';
import {Button, buttonGroup, ButtonGroupProps, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {throwIf, warnIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';
import {castArray, filter, isEmpty, without} from 'lodash';
import {Children, cloneElement, isValidElement} from 'react';

export interface ButtonGroupInputProps
    extends Omit<ButtonGroupProps<HoistModel>, 'onChange'>, HoistInputProps {
    /**
     * True to allow buttons to be unselected (aka inactivated). Defaults to false.
     * Does not apply when enableMulti: true.
     */
    enableClear?: boolean;

    /** True to allow entry/selection of multiple values - "tag picker" style. Defaults to false.*/
    enableMulti?: boolean;

    /** Intent applied to each button. */
    intent?: Intent;

    /** True to create outlined-style buttons. */
    outlined?: boolean;
}

/**
 * A segmented group of buttons, one of which is depressed to indicate the input's current value.
 *
 * Should receive a list of Buttons as a children. Each Button requires a 'value' prop.
 * The buttons are automatically configured to set this value on click and appear pressed if the
 * ButtonGroupInput's value matches.
 */
export const [ButtonGroupInput, buttonGroupInput] = hoistCmp.withFactory<ButtonGroupInputProps>({
    displayName: 'ButtonGroupInput',
    className: 'xh-button-group-input',
    render(props, ref) {
        warnIf(
            props.enableMulti && props.enableClear === false,
            'enableClear prop cannot be set to false when enableMulti is true - setting ignored.'
        );
        return useHoistInputModel(cmp, props, ref, ButtonGroupInputModel);
    }
});
(ButtonGroupInput as any).hasLayoutSupport = true;

//----------------------------------
// Implementation
//----------------------------------
class ButtonGroupInputModel extends HoistInputModel {
    override xhImpl = true;

    get enableMulti(): boolean {
        return !!this.componentProps.enableMulti;
    }

    get enableClear(): boolean {
        return !!this.componentProps.enableClear;
    }

    get enabledButtons(): HTMLButtonElement[] {
        const btns = this.domEl?.querySelectorAll('button') ?? [];
        return filter(btns, {disabled: false});
    }

    isActive(value: any): boolean {
        const {renderValue} = this;
        return this.enableMulti ? renderValue?.includes(value) : renderValue === value;
    }

    onButtonClick(value: any) {
        const isActive = this.isActive(value);
        if (this.enableMulti) {
            const current = this.renderValue ? castArray(this.renderValue) : [];
            value = isActive ? without(current, value) : [...current, value];
            if (isEmpty(value)) value = null;
        } else {
            value = this.enableClear && isActive ? null : value;
        }
        this.noteValueChange(value);
    }

    //-----------------
    // Overrides
    //-----------------
    override blur() {
        this.enabledButtons.forEach(it => it.blur());
    }

    override focus() {
        this.enabledButtons[0]?.focus();
    }
}

const cmp = hoistCmp.factory<ButtonGroupInputModel>(({model, className, ...props}, ref) => {
    const {
        children,
        // HoistInput Props
        bind,
        disabled,
        onChange,
        onCommit,
        tabIndex,
        value,
        // FormField Props
        commitOnChange,
        // ButtonGroupInput Props
        enableClear,
        enableMulti,
        // Button props applied to each child button
        intent,
        minimal,
        outlined,
        // ...and ButtonGroup gets all the rest
        ...buttonGroupProps
    } = getNonLayoutProps(props);

    const buttons = Children.map(children, button => {
        if (!button) return null;

        if (!isValidElement(button) || button.type !== Button) {
            throw XH.exception('ButtonGroupInput child must be a Button.');
        }

        const props = button.props as ButtonProps,
            {value, intent: btnIntent} = props,
            btnDisabled = disabled || props.disabled;

        throwIf(
            (enableClear || enableMulti) && value == null,
            'ButtonGroupInput child must declare a non-null value when enableClear or enableMulti are true'
        );

        const isActive = model.isActive(value);

        return cloneElement(button, {
            active: isActive,
            intent: btnIntent ?? intent,
            minimal: withDefault(minimal, false),
            outlined: withDefault(outlined, false),
            disabled: withDefault(btnDisabled, false),
            onClick: () => model.onButtonClick(value),
            // Workaround for https://github.com/palantir/blueprint/issues/3971
            key: `${isActive} ${value}`,
            autoFocus: isActive && model.hasFocus
        } as ButtonGroupProps);
    });

    return buttonGroup({
        items: buttons,
        ...(buttonGroupProps as ButtonGroupProps),
        minimal: withDefault(minimal, outlined, false),
        ...getLayoutProps(props),
        onBlur: model.onBlur,
        onFocus: model.onFocus,
        className,
        ref
    });
});
