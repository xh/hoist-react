/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/mobile/register';
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp, HoistProps, WithoutModelAndRef} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import './CheckboxButton.scss';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import {withDefault} from '@xh/hoist/utils/js';

export interface CheckboxButtonProps extends WithoutModelAndRef<ButtonProps>, HoistInputProps {
    value?: boolean;
}

/**
 * A button-based input to represent and toggle a boolean value.
 * Renders with a solid "checked" checkbox icon when true and an empty checkbox square when false.
 * If rendered within a FormField, will use its bound field's displayName for its text by default.
 */
export const [CheckboxButton, checkboxButton] = hoistCmp.withFactory<CheckboxButtonProps>({
    displayName: 'CheckboxButton',
    className: 'xh-checkbox-button',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, CheckboxButtonInputModel);
    }
});

class CheckboxButtonInputModel extends HoistInputModel {
    override xhImpl = true;
}

//----------------------------------
// Implementation
//----------------------------------
const cmp = hoistCmp.factory<
    HoistProps<CheckboxButtonInputModel, HTMLButtonElement> &
        WithoutModelAndRef<CheckboxButtonProps>
>(({model, text, ...props}, ref) => {
    const checked = !!model.renderValue;
    return button({
        text: withDefault(text, model.getField()?.displayName),
        icon: checked
            ? Icon.checkSquare({prefix: 'fas', intent: 'primary'})
            : Icon.square({prefix: 'fal'}),
        outlined: true,
        onClick: e => model.noteValueChange(!checked),
        ...props,
        ref
    });
});
