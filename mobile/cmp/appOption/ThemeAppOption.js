/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon/Icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {buttonGroupInput} from '@xh/hoist/mobile/cmp/input';

/**
 * Convenience configuration for the `theme` AppOption.
 * @param {{}} [formFieldProps]
 * @param {{}} [inputProps]
 */
export const themeAppOption = ({formFieldProps, inputProps} = {}) => {
    return {
        name: 'theme',
        formField: {
            label: 'Theme',
            item: buttonGroupInput({
                items: [
                    button({
                        value: false,
                        text: 'Light',
                        icon: Icon.sun(),
                        width: '50%'
                    }),
                    button({
                        value: true,
                        text: 'Dark',
                        icon: Icon.moon(),
                        width: '50%'
                    })
                ],
                width: '100%',
                ...inputProps
            }),
            ...formFieldProps
        },
        valueGetter: () => XH.darkTheme,
        valueSetter: (v) => XH.setDarkTheme(v)
    };
};
