/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {switchInput} from '@xh/hoist/mobile/cmp/input';
import '@xh/hoist/mobile/register';

interface AutoRefreshAppOptionSpec {
    /** Props for nested FormField - todo: replace with FormFieldProps */
    formFieldProps?: Record<string, any>,
    /** Props for nested SwitchInput - todo: replace with SwitchInputProps */
    inputProps?: Record<string, any>
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