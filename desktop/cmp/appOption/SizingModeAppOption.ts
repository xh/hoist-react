/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {AppOptionSpec, SizingMode, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput, ButtonGroupInputProps} from '@xh/hoist/desktop/cmp/input';
import {startCase, values} from 'lodash';
import {FormFieldProps} from '@xh/hoist/desktop/cmp/form';
import '@xh/hoist/desktop/register';

interface SizingModeAppOptionSpec {
    /** Supported SizingModes */
    modes?: SizingMode[];
    /** Props for nested FormField */
    formFieldProps?: FormFieldProps;
    /** Props for nested ButtonGroupInput */
    inputProps?: ButtonGroupInputProps;
}

/**
 * Convenience configuration for the `sizingMode` AppOption.
 */
export const sizingModeAppOption = ({
    modes,
    formFieldProps,
    inputProps
}: SizingModeAppOptionSpec = {}): AppOptionSpec => {
    if (!modes) modes = values(SizingMode);
    return {
        name: 'sizingMode',
        formField: {
            label: 'Grid sizing',
            item: buttonGroupInput({
                items: modes.map(mode =>
                    button({
                        value: mode,
                        text: startCase(mode),
                        flex: 1,
                        style: {
                            fontSize: `var(--xh-grid-${mode}-font-size-px)`
                        }
                    })
                ),
                ...inputProps
            }),
            ...formFieldProps
        },
        valueGetter: () => XH.sizingMode,
        valueSetter: v => XH.setSizingMode(v)
    };
};
