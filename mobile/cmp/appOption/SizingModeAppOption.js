/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/mobile/cmp/button';
import {buttonGroupInput} from '@xh/hoist/mobile/cmp/input';
import {startCase} from 'lodash';

/**
 * Convenience configuration for a sizingMode AppOption.
 */
export const sizingModeAppOption = () => ({
    name: 'sizingMode',
    formField: {
        label: 'Default grid size',
        item: buttonGroupInput(
            getGridSizeModeButton('large'),
            getGridSizeModeButton('standard'),
            getGridSizeModeButton('compact'),
            getGridSizeModeButton('tiny')
        )
    },
    valueGetter: () => XH.sizingMode,
    valueSetter: (v) => XH.setSizingMode(v)
});

function getGridSizeModeButton(size) {
    return button({
        value: size,
        text: startCase(size),
        width: 80,
        style: {
            fontSize: `var(--xh-grid-${size}-font-size-px)`
        }
    });
}