/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistInputProps, HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp, StyleProps} from '@xh/hoist/core';
import {switchControl} from '@xh/hoist/kit/onsen';
import '@xh/hoist/mobile/register';
import './SwitchInput.scss';

export interface SwitchInputProps extends HoistInputProps, StyleProps {
    value?: string;

    /** Onsen modifier string */
    modifier?: string;
}

/**
 * Switch (toggle) control for non-nullable boolean values.
 */
export const [SwitchInput, switchInput] = hoistCmp.withFactory<SwitchInputProps>({
    displayName: 'SwitchInput',
    className: 'xh-switch-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, SwitchInputModel);
    }
});

class SwitchInputModel extends HoistInputModel {
    override xhImpl = true;
}

//-----------------------
// Implementation
//-----------------------
const cmp = hoistCmp.factory<SwitchInputModel>(({model, className, ...props}, ref) => {
    return switchControl({
        checked: !!model.renderValue,

        disabled: props.disabled,
        modifier: props.modifier,
        tabIndex: props.tabIndex,

        className,
        style: props.style,

        onBlur: model.onBlur,
        onFocus: model.onFocus,
        onChange: e => model.noteValueChange(e.target.checked),

        ref
    });
});
