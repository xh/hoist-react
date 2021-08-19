/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/mobile/cmp/button';
import {buttonGroupInput} from '@xh/hoist/mobile/cmp/input';
import {Icon} from '@xh/hoist/icon/Icon';

/**
 * Convenience configuration for a theme AppOption.
 */
export const themeAppOption = () => ({
    name: 'theme',
    formField: {
        label: 'Theme',
        item: buttonGroupInput(
            button({value: false, text: 'Light', icon: Icon.sun(), width: 80}),
            button({value: true, text: 'Dark', icon: Icon.moon(), width: 80})
        )
    },
    valueGetter: () => XH.darkTheme,
    valueSetter: (v) => XH.setDarkTheme(v)
});