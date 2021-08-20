/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {SizingMode, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {startCase, values} from 'lodash';

/**
 * Convenience configuration for the `sizingMode` AppOption.
 * @param {SizingMode[]} [modes] - Supported SizingModes
 * @param {{}} [formFieldProps]
 * @param {{}} [inputProps]
 */
export const sizingModeAppOption = ({modes, formFieldProps, inputProps} = {}) => {
    if (!modes) modes = values(SizingMode);
    return {
        name: 'sizingMode',
        formField: {
            label: 'Grid sizing',
            item: buttonGroupInput({
                items: modes.map(mode => button({
                    value: mode,
                    text: startCase(mode),
                    flex: 1,
                    style: {
                        fontSize: `var(--xh-grid-${mode}-font-size-px)`
                    }
                })),
                ...inputProps
            }),
            ...formFieldProps
        },
        valueGetter: () => XH.sizingMode,
        valueSetter: (v) => XH.setSizingMode(v)
    };
};
