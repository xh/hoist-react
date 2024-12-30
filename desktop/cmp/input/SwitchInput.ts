/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp, HoistProps, HSide, StyleProps} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {switchControl} from '@xh/hoist/kit/blueprint';
import {TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {ReactNode} from 'react';
import './SwitchInput.scss';

export interface SwitchInputProps extends HoistProps, HoistInputProps, StyleProps {
    value?: boolean;

    /** True if the control should appear as an inline element (defaults to true). */
    inline?: boolean;

    /**
     * Label displayed adjacent to the control itself.
     * Can be used with or without an additional overall label as provided by FormField.
     */
    label?: ReactNode;

    /** Placement of the inline label relative to the control itself, default 'right'. */
    labelSide?: HSide;
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

//-----------------------
// Implementation
//-----------------------
class SwitchInputModel extends HoistInputModel {
    override xhImpl = true;
}

const cmp = hoistCmp.factory<SwitchInputModel>(({model, className, ...props}, ref) => {
    const labelSide = withDefault(props.labelSide, 'right');

    return switchControl({
        checked: !!model.renderValue,

        alignIndicator: labelSide === 'left' ? 'right' : 'left',
        disabled: props.disabled,
        inline: withDefault(props.inline, true),
        label: props.label,
        style: props.style,
        tabIndex: props.tabIndex,

        id: props.id,
        className,

        [TEST_ID]: props.testId,
        onBlur: model.onBlur,
        onFocus: model.onFocus,
        onChange: e => model.noteValueChange(e.target.checked),
        inputRef: model.inputRef,
        ref
    });
});
