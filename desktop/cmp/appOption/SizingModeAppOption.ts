/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AppOptionSpec, SizingMode, XH} from '@xh/hoist/core';
import {segmentedControl, SegmentedControlProps} from '@xh/hoist/desktop/cmp/input';
import {startCase, values} from 'lodash';
import {FormFieldProps} from '@xh/hoist/desktop/cmp/form';
import '@xh/hoist/desktop/register';

interface SizingModeAppOptionSpec {
    /** Supported SizingModes */
    modes?: SizingMode[];
    /** Props for nested FormField */
    formFieldProps?: FormFieldProps;
    /** Props for nested SegmentedControl */
    inputProps?: SegmentedControlProps;
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
            item: segmentedControl({
                options: modes.map(mode => ({value: mode, label: startCase(mode)})),
                ...inputProps
            }),
            ...formFieldProps
        },
        refreshRequired: false,
        valueGetter: () => XH.sizingMode,
        valueSetter: v => XH.setSizingMode(v)
    };
};
