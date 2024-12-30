/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {switchInput, SwitchInputProps} from '@xh/hoist/desktop/cmp/input';
import {FormFieldProps} from '@xh/hoist/desktop/cmp/form';
import '@xh/hoist/desktop/register';

interface AutoRefreshAppOptionSpec {
    /** Props for nested FormField. */
    formFieldProps?: FormFieldProps;
    /** Props for nested SwitchInput */
    inputProps?: SwitchInputProps;
}

/**
 * Convenience configuration for the `autoRefresh` AppOption.
 */
export const autoRefreshAppOption = ({
    formFieldProps,
    inputProps
}: AutoRefreshAppOptionSpec = {}) => {
    return {
        omit: XH.autoRefreshService.interval <= 0,
        name: 'autoRefresh',
        prefName: 'xhAutoRefreshEnabled',
        formField: {
            label: 'Auto-refresh',
            info: `Enable to auto-refresh app data every ${XH.autoRefreshService.interval} seconds`,
            item: switchInput({...inputProps}),
            ...formFieldProps
        }
    };
};
