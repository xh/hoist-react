/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {checkbox as onsenCheckbox} from '@xh/hoist/kit/onsen';
import '@xh/hoist/mobile/register';
import './Checkbox.scss';

export interface CheckboxProps extends HoistProps, HoistInputProps {
    value?: boolean;

    /** Onsen modifier string */
    modifier?: string;
}

/**
 * Checkbox control for boolean values.
 */
export const [Checkbox, checkbox] = hoistCmp.withFactory<CheckboxProps>({
    displayName: 'Checkbox',
    className: 'xh-check-box',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, CheckboxInputModel);
    }
});

class CheckboxInputModel extends HoistInputModel {
    override xhImpl = true;
}

//----------------------------------
// Implementation
//----------------------------------
const cmp = hoistCmp.factory<CheckboxInputModel>(({model, className, ...props}, ref) => {
    return onsenCheckbox({
        checked: !!model.renderValue,

        disabled: props.disabled,
        modifier: props.modifier,
        tabIndex: props.tabIndex,

        style: props.style,

        onBlur: model.onBlur,
        onFocus: model.onFocus,
        onChange: e => model.noteValueChange(e.target.checked),

        className,
        ref
    });
});
