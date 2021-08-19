/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH, SizingMode} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {values, startCase} from 'lodash';

/**
 * Convenience configuration for a sizingMode AppOption.
 * @param {SizingMode[]} [modes] - Supported SizingModes.
 */
export const sizingModeAppOption = (modes) => {
    if (!modes) modes = values(SizingMode);
    return {
        name: 'sizingMode',
        formField: {
            label: 'Grid sizing',
            item: buttonGroupInput(
                modes.map(mode => button({
                    value: mode,
                    text: startCase(mode),
                    style: {
                        fontSize: `var(--xh-grid-${mode}-font-size-px)`
                    }
                }))
            )
        },
        valueGetter: () => XH.sizingMode,
        valueSetter: (v) => XH.setSizingMode(v)
    };
};
