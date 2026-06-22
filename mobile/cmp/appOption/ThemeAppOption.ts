/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AppOptionSpec, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon/Icon';
import {FormFieldProps} from '@xh/hoist/mobile/cmp/form';
import {segmentedControl, SegmentedControlProps} from '@xh/hoist/mobile/cmp/input';
import '@xh/hoist/mobile/register';

interface ThemeAppOptionSpec {
    /** Props for nested FormField */
    formFieldProps?: Partial<FormFieldProps>;
    /** Props for nested SegmentedControl */
    inputProps?: Partial<SegmentedControlProps>;
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
            item: segmentedControl({
                options: [
                    {value: 'light', label: 'Light', icon: Icon.sun()},
                    {value: 'dark', label: 'Dark', icon: Icon.moon()},
                    {value: 'system', label: 'System', icon: Icon.sync()}
                ],
                ...inputProps
            }),
            ...formFieldProps
        },
        prefName: 'xhTheme',
        valueSetter: v => XH.setTheme(v)
    };
};
