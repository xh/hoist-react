/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import {div} from '@xh/hoist/cmp/layout';
import {AppOptionSpec, SizingMode, XH} from '@xh/hoist/core';
import {
    radioCardInput,
    RadioCardInputProps,
    segmentedControl,
    SegmentedControlProps
} from '@xh/hoist/desktop/cmp/input';
import {startCase, times, values} from 'lodash';
import {FormFieldProps} from '@xh/hoist/desktop/cmp/form';
import '@xh/hoist/desktop/register';
import type {ReactElement} from 'react';
import './SizingModeAppOption.scss';

interface SizingModeAppOptionSpec {
    /** Supported SizingModes */
    modes?: SizingMode[];
    /** Props for nested FormField */
    formFieldProps?: Partial<FormFieldProps>;
    /** Props for nested RadioCardInput, or SegmentedControl if `previewCards` is false. */
    inputProps?: Partial<SegmentedControlProps> | Partial<RadioCardInputProps>;
    /**
     * True (default) to render the choices as a RadioCardInput, with each card showing a small
     * grid drawn at that mode's row height. Set false for a compact SegmentedControl.
     */
    previewCards?: boolean;
}

/**
 * Convenience configuration for the `sizingMode` AppOption.
 */
export const sizingModeAppOption = ({
    modes,
    formFieldProps,
    inputProps,
    previewCards = true
}: SizingModeAppOptionSpec = {}): AppOptionSpec => {
    if (!modes) modes = values(SizingMode);
    return {
        name: 'sizingMode',
        formField: {
            label: 'Grid sizing',
            item: previewCards
                ? radioCardInput({
                      options: modes.map(mode => ({
                          value: mode,
                          label: startCase(mode),
                          preview: sizingModePreview(mode)
                      })),
                      ...(inputProps as Partial<RadioCardInputProps>)
                  })
                : segmentedControl({
                      options: modes.map(mode => ({value: mode, label: startCase(mode)})),
                      ...(inputProps as Partial<SegmentedControlProps>)
                  }),
            ...formFieldProps
        },
        refreshRequired: false,
        valueGetter: () => XH.sizingMode,
        valueSetter: v => XH.setSizingMode(v)
    };
};

/** Scale applied to real grid header and row heights to fit them in the preview. */
const PREVIEW_SCALE = 0.22,
    PREVIEW_HEIGHT = 36;

/**
 * A mini grid drawn at the given mode's actual header and row heights, scaled down, so each card
 * shows how many rows that mode fits in the same space.
 */
function sizingModePreview(mode: SizingMode): ReactElement {
    const ag = AgGrid as any,
        headerHeight = ag.getHeaderHeightForSizingMode(mode) * PREVIEW_SCALE,
        rowHeight = ag.getRowHeightForSizingMode(mode) * PREVIEW_SCALE,
        rowCount = Math.ceil((PREVIEW_HEIGHT - headerHeight) / rowHeight);

    return div({
        className: `xh-sizing-mode-preview xh-sizing-mode-preview--${mode}`,
        items: [
            div({
                className: 'xh-sizing-mode-preview__header',
                style: {height: headerHeight},
                items: previewCells()
            }),
            ...times(rowCount, i =>
                div({
                    key: i,
                    className: 'xh-sizing-mode-preview__row',
                    style: {height: rowHeight},
                    items: previewCells()
                })
            )
        ]
    });
}

function previewCells(): ReactElement[] {
    return [
        div({key: 'a', className: 'xh-sizing-mode-preview__cell'}),
        div({key: 'b', className: 'xh-sizing-mode-preview__cell xh-sizing-mode-preview__cell--num'})
    ];
}
