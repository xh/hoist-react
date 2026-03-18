/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {segmentedControl, SegmentedControlProps} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon/Icon';
import {FormFieldProps} from '@xh/hoist/desktop/cmp/form';
import '@xh/hoist/desktop/register';

interface ThemeAppOptionSpec {
    /** Props for nested FormField */
    formFieldProps?: FormFieldProps;
    /** Props for nested SegmentedControl */
    inputProps?: SegmentedControlProps;
}

/**
 * Convenience configuration for the `theme` AppOption.
 */
export const themeAppOption = ({formFieldProps, inputProps}: ThemeAppOptionSpec = {}) => {
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
        refreshRequired: false,
        prefName: 'xhTheme',
        valueSetter: v => XH.setTheme(v)
    };
};
