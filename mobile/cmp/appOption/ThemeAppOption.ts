/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {AppOptionSpec, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon/Icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {FormFieldProps} from '@xh/hoist/mobile/cmp/form';
import {buttonGroupInput, ButtonGroupInputProps} from '@xh/hoist/mobile/cmp/input';
import '@xh/hoist/mobile/register';

interface ThemeAppOptionSpec {
    /** Props for nested FormField */
    formFieldProps?: FormFieldProps;
    /** Props for nested ButtonGroupInput */
    inputProps?: ButtonGroupInputProps;
}

/**
 * Convenience configuration for the `theme` AppOption.
 */
export const themeAppOption = ({
    formFieldProps,
    inputProps
}: ThemeAppOptionSpec = {}): AppOptionSpec => {
    return {
        name: 'theme',
        formField: {
            label: 'Theme',
            item: buttonGroupInput({
                items: [
                    button({
                        value: 'light',
                        text: 'Light',
                        icon: Icon.sun(),
                        width: '33.33%'
                    }),
                    button({
                        value: 'dark',
                        text: 'Dark',
                        icon: Icon.moon(),
                        width: '33.33%'
                    }),
                    button({
                        value: 'system',
                        text: 'System',
                        icon: Icon.sync(),
                        width: '33.33%'
                    })
                ],
                width: '100%',
                ...inputProps
            }),
            ...formFieldProps
        },
        prefName: 'xhTheme',
        valueSetter: v => XH.setTheme(v)
    };
};
