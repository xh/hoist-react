/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistInputProps} from '@xh/hoist/cmp/input';
import {HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import type {HoistProps, HSide, StyleProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {switchControl} from '@xh/hoist/kit/blueprint';
import {TEST_ID, withDefault} from '@xh/hoist/utils/js';
import type {ReactNode} from 'react';
import {control} from './impl/Control';
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
export interface SwitchInputDefaults {
    /**
     * True to render desktop switches with Blueprint's, as before Hoist had its own.
     * For apps to fall back on while they adopt Hoist's - removed in the next major version.
     */
    useBlueprint?: boolean;
}

export const [SwitchInput, switchInput] = hoistCmp.withFactory<
    SwitchInputProps,
    SwitchInputDefaults
>({
    displayName: 'SwitchInput',
    className: 'xh-switch-input',
    defaults: {
        useBlueprint: false
    },
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

    const alignIndicator = labelSide === 'left' ? 'right' : 'left',
        inline = withDefault(props.inline, true),
        inputProps = {
            checked: !!model.renderValue,
            disabled: props.disabled,
            tabIndex: props.tabIndex,
            id: props.id,
            [TEST_ID]: props.testId,
            ...props.domAttrs,
            onBlur: model.onBlur,
            onFocus: model.onFocus,
            onChange: e => model.noteValueChange(e.target.checked)
        };

    if (SwitchInput.defaults.useBlueprint) {
        return switchControl({
            ...inputProps,
            alignIndicator,
            inline,
            label: props.label,
            style: props.style,
            className,
            inputRef: model.inputRef,
            ref
        });
    }

    return control({
        kind: 'switch',
        alignIndicator,
        inline,
        label: props.label,
        className,
        style: props.style,
        ref,
        inputRef: model.inputRef as any,
        inputProps
    });
});
