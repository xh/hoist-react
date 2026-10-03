/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {XH} from '@xh/hoist/core';
import {
    radioCardInput,
    RadioCardInputProps,
    segmentedControl,
    SegmentedControlProps
} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon/Icon';
import {FormFieldProps} from '@xh/hoist/desktop/cmp/form';
import '@xh/hoist/desktop/register';
import type {ReactElement} from 'react';
import './ThemeAppOption.scss';

interface ThemeAppOptionSpec {
    /** Props for nested FormField */
    formFieldProps?: Partial<FormFieldProps>;
    /** Props for nested SegmentedControl, or RadioCardInput if `previewCards` is true. */
    inputProps?: Partial<SegmentedControlProps> | Partial<RadioCardInputProps>;
    /**
     * True to render the choices as a RadioCardInput, with each card showing a small preview of
     * an app window in that theme. Default false, for a compact SegmentedControl.
     */
    previewCards?: boolean;
}

/**
 * Convenience configuration for the `theme` AppOption.
 */
export const themeAppOption = ({
    formFieldProps,
    inputProps,
    previewCards = false
}: ThemeAppOptionSpec = {}) => {
    return {
        name: 'theme',
        formField: {
            label: 'Theme',
            item: previewCards
                ? radioCardInput({
                      options: [
                          {value: 'light', label: 'Light', preview: themePreview('light')},
                          {value: 'dark', label: 'Dark', preview: themePreview('dark')},
                          {value: 'system', label: 'System', preview: themePreview('system')}
                      ],
                      ...(inputProps as Partial<RadioCardInputProps>)
                  })
                : segmentedControl({
                      options: [
                          {value: 'light', label: 'Light', icon: Icon.sun()},
                          {value: 'dark', label: 'Dark', icon: Icon.moon()},
                          {value: 'system', label: 'System', icon: Icon.sync()}
                      ],
                      ...(inputProps as Partial<SegmentedControlProps>)
                  }),
            ...formFieldProps
        },
        refreshRequired: false,
        prefName: 'xhTheme',
        valueSetter: v => XH.setTheme(v)
    };
};

/**
 * A mini app window drawn in fixed light or dark colors, so each card shows its theme regardless
 * of the active one. 'system' splits the window diagonally.
 */
function themePreview(theme: 'light' | 'dark' | 'system'): ReactElement {
    return div({
        className: `xh-theme-preview xh-theme-preview--${theme}`,
        items: [
            div({
                className: 'xh-theme-preview__chrome',
                items: [0, 1, 2].map(i => div({key: i, className: 'xh-theme-preview__dot'}))
            }),
            div({
                className: 'xh-theme-preview__content',
                items: [
                    div({className: 'xh-theme-preview__accent'}),
                    div({className: 'xh-theme-preview__line'}),
                    div({className: 'xh-theme-preview__line xh-theme-preview__line--short'})
                ]
            })
        ]
    });
}
