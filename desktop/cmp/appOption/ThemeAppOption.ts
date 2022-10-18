/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon/Icon';

interface ThemeAppOptionSpec {
    /** Props for nested FormField - todo: replace with FormFieldProps */
    formFieldProps?: Record<string, any>,
    /** Props for nested ButtonGroupInput - todo: replace with ButtonGroupInputProps */
    inputProps?: Record<string, any>
}

/**
 * Convenience configuration for the `theme` AppOption.
 */
export const themeAppOption = ({
    formFieldProps,
    inputProps
}: ThemeAppOptionSpec = {}) => {
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
        valueSetter: (v) => XH.setTheme(v)
    };
};