/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput, ButtonGroupInputProps} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon/Icon';
import {FormFieldProps} from '@xh/hoist/desktop/cmp/form';
import '@xh/hoist/desktop/register';

interface ThemeAppOptionSpec {
    /** Props for nested FormField */
    formFieldProps?: FormFieldProps;
    /** Props for nested ButtonGroupInput */
    inputProps?: ButtonGroupInputProps;
}

/**
 * Convenience configuration for the `theme` AppOption.
 */
export const themeAppOption = ({formFieldProps, inputProps}: ThemeAppOptionSpec = {}) => {
    return {
        name: 'theme',
        formField: {
            label: 'Theme',
            item: buttonGroupInput({
                items: [
                    button({value: 'light', text: 'Light', icon: Icon.sun(), width: '33.33%'}),
                    button({value: 'dark', text: 'Dark', icon: Icon.moon(), width: '33.33%'}),
                    button({value: 'system', text: 'System', icon: Icon.sync(), width: '33.33%'})
                ],
                ...inputProps
            }),
            ...formFieldProps
        },
        prefName: 'xhTheme',
        valueSetter: v => XH.setTheme(v)
    };
};
