/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {SizingMode, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/mobile/cmp/button';
import {buttonGroupInput, ButtonGroupInputProps} from '@xh/hoist/mobile/cmp/input';
import {FormFieldProps} from '../form/FormField';
import '@xh/hoist/mobile/register';
import {startCase, values} from 'lodash';

interface SizingModeAppOptionSpec {
    /** Supported SizingModes */
    modes?: SizingMode[];
    /** Props for nested FormField. */
    formFieldProps?: FormFieldProps;
    /** Props for nested ButtonGroupInput. */
    inputProps?: ButtonGroupInputProps;
}

/**
 * Convenience configuration for the `sizingMode` AppOption.
 */
export const sizingModeAppOption = ({
    modes,
    formFieldProps,
    inputProps
}: SizingModeAppOptionSpec = {}) => {
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
                width: '100%',
                ...inputProps
            }),
            ...formFieldProps
        },
        valueGetter: () => XH.sizingMode,
        valueSetter: v => XH.setSizingMode(v)
    };
};
